import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/index.js';
import { IBill, IBillItem, BillStatus } from '../models/types.js';
import { AppError } from '../middlewares/errorHandler.js';
import { logAuditEvent } from '../middlewares/audit.middleware.js';
import { NotificationService } from './notification.service.js';

export class BillService {
  /**
   * Authoritative server-side bill creation and charge calculation
   */
  public static async createBill(
    data: {
      patientId: string;
      admissionId?: string | null;
      items: Array<{
        description: string;
        category: string;
        quantity: number;
        unitPrice: number;
      }>;
      discount?: number;
      taxRatePercent?: number;
    },
    actor: { id: string; name: string; role: any }
  ): Promise<IBill> {
    const patient = db.patients.find((p) => p.id === data.patientId);
    if (!patient) {
      throw new AppError(`Patient with ID '${data.patientId}' not found.`, 404, 'PATIENT_NOT_FOUND');
    }

    // Authoritative calculations
    let subtotal = 0;
    const computedItems: IBillItem[] = data.items.map((item) => {
      const amount = Math.round(item.quantity * item.unitPrice * 100) / 100;
      subtotal += amount;
      return {
        id: `item-${uuidv4().substring(0, 8)}`,
        description: item.description,
        category: item.category,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount,
      };
    });

    const discount = Math.max(0, data.discount || 0);
    const taxRate = data.taxRatePercent !== undefined ? data.taxRatePercent : 5; // Default 5%
    const tax = Math.round(((subtotal - discount) * (taxRate / 100)) * 100) / 100;
    const total = Math.max(0, Math.round((subtotal - discount + tax) * 100) / 100);

    const billId = `bill-${uuidv4().substring(0, 8)}`;
    const billCode = `INV-${3000 + db.bills.length + 1}`;

    const newBill: IBill = {
      id: billId,
      billCode,
      patientId: patient.id,
      patientName: patient.fullName,
      admissionId: data.admissionId || null,
      items: computedItems,
      subtotal,
      tax,
      discount,
      total,
      amountPaid: 0,
      balance: total,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.bills.unshift(newBill);

    logAuditEvent(actor, 'BILL_GENERATED', 'Bill', newBill.id, 'SUCCESS', undefined, {
      billCode: newBill.billCode,
      patientId: patient.id,
      total: newBill.total,
    });

    NotificationService.send({
      recipientId: patient.userId,
      recipientRole: 'patient',
      title: 'New Hospital Bill Generated',
      message: `Invoice ${newBill.billCode} for $${newBill.total.toFixed(2)} has been generated.`,
      type: 'INFO',
    });

    return newBill;
  }

  public static async recordPayment(
    billId: string,
    amountPaid: number,
    actor: { id: string; name: string; role: any }
  ): Promise<IBill> {
    const bill = db.bills.find((b) => b.id === billId);
    if (!bill) {
      throw new AppError(`Bill with ID '${billId}' not found.`, 404, 'BILL_NOT_FOUND');
    }

    if (amountPaid <= 0) {
      throw new AppError('Payment amount must be greater than zero.', 400, 'INVALID_AMOUNT');
    }

    if (amountPaid > bill.balance) {
      throw new AppError(
        `Payment amount of $${amountPaid.toFixed(2)} exceeds remaining balance of $${bill.balance.toFixed(2)}.`,
        400,
        'OVERPAYMENT_NOT_PERMITTED'
      );
    }

    bill.amountPaid = Math.round((bill.amountPaid + amountPaid) * 100) / 100;
    bill.balance = Math.round((bill.total - bill.amountPaid) * 100) / 100;
    
    if (bill.balance === 0) {
      bill.status = 'Paid';
    } else {
      bill.status = 'Partially Paid';
    }
    bill.updatedAt = new Date().toISOString();

    logAuditEvent(actor, 'BILL_PAYMENT_RECORDED', 'Bill', bill.id, 'SUCCESS', undefined, {
      billCode: bill.billCode,
      amountReceived: amountPaid,
      newBalance: bill.balance,
      newStatus: bill.status,
    });

    const patient = db.patients.find((p) => p.id === bill.patientId);
    if (patient) {
      NotificationService.send({
        recipientId: patient.userId,
        recipientRole: 'patient',
        title: 'Payment Received',
        message: `Payment of $${amountPaid.toFixed(2)} received for Invoice ${bill.billCode}. Remaining balance: $${bill.balance.toFixed(2)}.`,
        type: 'SUCCESS',
      });
    }

    return bill;
  }

  public static async getByPatientId(patientId: string): Promise<IBill[]> {
    return db.bills.filter((b) => b.patientId === patientId);
  }

  public static async getAll(): Promise<IBill[]> {
    return db.bills;
  }
}
