import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { IConversation, IMessage, UserRole } from '../models/types.js';
import { AppError } from '../middlewares/errorHandler.js';
import { NotificationService } from './notification.service.js';

export interface ChatActor {
  id: string;
  fullName: string;
  role: UserRole;
  patientId?: string;
  doctorId?: string;
}

const participantKey = (ids: string[]): string => [...new Set(ids)].sort().join('|');

export class ConversationService {
  private static canAccess(conversation: IConversation, actor: ChatActor): boolean {
    if (actor.role === 'admin') return true;
    if (conversation.participantUserIds.includes(actor.id)) return true;
    if (actor.role === 'patient' && conversation.patientId === actor.patientId) return true;
    return false;
  }

  private static assertAccess(conversation: IConversation, actor: ChatActor): void {
    if (!this.canAccess(conversation, actor)) {
      throw new AppError(
        'Access denied. You are not a participant in this conversation.',
        403,
        'IDOR_FORBIDDEN'
      );
    }
  }

  public static listForUser(actor: ChatActor): IConversation[] {
    const list =
      actor.role === 'admin'
        ? [...db.conversations]
        : db.conversations.filter((conversation) =>
            conversation.participantUserIds.includes(actor.id) ||
            (actor.role === 'patient' && conversation.patientId === actor.patientId)
          );

    return list.sort((a, b) => {
      const left = a.lastMessageAt || a.updatedAt || a.createdAt;
      const right = b.lastMessageAt || b.updatedAt || b.createdAt;
      return right.localeCompare(left);
    });
  }

  public static getById(conversationId: string, actor: ChatActor): IConversation {
    const conversation = db.conversations.find((item) => item.id === conversationId);
    if (!conversation) {
      throw new AppError(
        `Conversation with ID '${conversationId}' was not found.`,
        404,
        'CONVERSATION_NOT_FOUND'
      );
    }
    this.assertAccess(conversation, actor);
    return conversation;
  }

  /**
   * Finds the conversation for a patient/clinician pair or creates it.
   * Creating the same pair twice returns the existing thread instead of
   * spawning duplicate "chat" records.
   */
  public static getOrCreate(
    input: { patientId?: string; doctorId?: string; subject?: string },
    actor: ChatActor
  ): IConversation {
    const patientId =
      actor.role === 'patient' ? actor.patientId : input.patientId;

    if (!patientId) {
      throw new AppError(
        'A patientId is required to start a conversation.',
        400,
        'MISSING_PATIENT'
      );
    }

    const patient = db.patients.find((item) => item.id === patientId);
    if (!patient) {
      throw new AppError(`Patient with ID '${patientId}' not found.`, 404, 'PATIENT_NOT_FOUND');
    }

    if (actor.role === 'patient' && patient.id !== actor.patientId) {
      throw new AppError(
        'Access denied. You can only start conversations for your own record.',
        403,
        'IDOR_FORBIDDEN'
      );
    }

    let doctorId: string | undefined;
    if (actor.role === 'doctor') {
      doctorId = actor.doctorId;
      if (!doctorId) {
        throw new AppError(
          'No doctor profile is linked to this account.',
          400,
          'DOCTOR_PROFILE_MISSING'
        );
      }
      const hasRelationship =
        patient.assignedDoctorId === doctorId ||
        db.appointments.some((a) => a.patientId === patient.id && a.doctorId === doctorId);
      if (!hasRelationship) {
        throw new AppError(
          'Access denied. You can only message your assigned patients.',
          403,
          'IDOR_FORBIDDEN'
        );
      }
    } else {
      doctorId =
        input.doctorId ||
        patient.assignedDoctorId ||
        db.appointments.find(
          (a) => a.patientId === patient.id && a.status !== 'Cancelled'
        )?.doctorId;
    }

    if (doctorId && !db.doctors.some((d) => d.id === doctorId && d.isActive)) {
      throw new AppError(`Doctor with ID '${doctorId}' not found or inactive.`, 404, 'DOCTOR_NOT_FOUND');
    }

    const doctorUserIds = new Set<string>();
    const doctor = doctorId ? db.doctors.find((d) => d.id === doctorId) : undefined;
    if (doctor?.userId) doctorUserIds.add(doctor.userId);

    // Include the patient's portal account only when one exists. Conversations
    // remain readable by staff/admins using the patientId link.
    const participantUserIds = new Set<string>();
    if (patient.userId) participantUserIds.add(patient.userId);
    doctorUserIds.forEach((id) => participantUserIds.add(id));
    if (actor.role !== 'patient') participantUserIds.add(actor.id);
    if (actor.role === 'patient') participantUserIds.add(actor.id);

    const participantNames: string[] = [];
    const participantRoles: UserRole[] = [];
    for (const userId of participantUserIds) {
      const user = db.users.find((u) => u.id === userId);
      if (user) {
        participantNames.push(user.fullName);
        participantRoles.push(user.role);
      }
    }

    const existing = db.conversations.find(
      (conversation) =>
        conversation.patientId === patient.id &&
        (doctorId ? conversation.doctorId === doctorId : true) &&
        participantKey(conversation.participantUserIds) ===
          participantKey([...participantUserIds])
    );

    if (existing) {
      if (input.subject && !existing.subject) existing.subject = input.subject;
      return existing;
    }

    const now = new Date().toISOString();
    const conversation: IConversation = {
      id: `conv-${uuidv4().substring(0, 8)}`,
      patientId: patient.id,
      patientName: patient.fullName,
      doctorId,
      participantUserIds: [...participantUserIds],
      participantNames,
      participantRoles,
      subject: input.subject || (doctor ? `Care thread with ${doctor.fullName}` : 'Care thread'),
      createdBy: actor.id,
      createdAt: now,
      updatedAt: now,
    };

    db.conversations.unshift(conversation);
    return conversation;
  }

  public static getMessages(conversationId: string, actor: ChatActor): IMessage[] {
    const conversation = this.getById(conversationId, actor);
    return db.messages
      .filter((message) => message.conversationId === conversation.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  public static sendMessage(
    conversationId: string,
    body: string,
    actor: ChatActor
  ): IMessage {
    const conversation = this.getById(conversationId, actor);
    const text = body.trim();
    if (!text) {
      throw new AppError('Message cannot be empty.', 400, 'EMPTY_MESSAGE');
    }
    if (text.length > 4000) {
      throw new AppError('Message must be 4000 characters or fewer.', 400, 'MESSAGE_TOO_LONG');
    }

    const now = new Date().toISOString();
    const message: IMessage = {
      id: `msg-${uuidv4().substring(0, 8)}`,
      conversationId: conversation.id,
      senderId: actor.id,
      senderName: actor.fullName,
      senderRole: actor.role,
      body: text,
      createdAt: now,
      readBy: [actor.id],
    };

    db.messages.push(message);

    conversation.lastMessageAt = now;
    conversation.lastMessagePreview = text.length > 120 ? `${text.slice(0, 117)}...` : text;
    conversation.updatedAt = now;

    for (const participantId of conversation.participantUserIds) {
      if (participantId === actor.id) continue;
      const recipient = db.users.find((user) => user.id === participantId && user.isActive);
      if (!recipient) continue;
      NotificationService.send({
        recipientId: recipient.id,
        recipientRole: recipient.role,
        title: `New message from ${actor.fullName}`,
        message: conversation.lastMessagePreview,
        type: 'INFO',
        link: `/messages?conversation=${conversation.id}`,
      });
    }

    return message;
  }

  public static markRead(conversationId: string, actor: ChatActor): IMessage[] {
    const conversation = this.getById(conversationId, actor);
    const messages = db.messages.filter(
      (message) => message.conversationId === conversation.id
    );
    for (const message of messages) {
      if (!message.readBy.includes(actor.id)) message.readBy.push(actor.id);
    }
    return messages;
  }

  public static unreadCount(actor: ChatActor): number {
    const conversations = this.listForUser(actor);
    const ids = new Set(conversations.map((conversation) => conversation.id));
    return db.messages.filter(
      (message) =>
        ids.has(message.conversationId) &&
        message.senderId !== actor.id &&
        !message.readBy.includes(actor.id)
    ).length;
  }
}
