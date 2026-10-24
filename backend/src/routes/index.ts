import { Router } from 'express';
import authRoutes from './auth.routes.js';
import patientRoutes from './patient.routes.js';
import bedRoutes from './bed.routes.js';
import admissionRoutes from './admission.routes.js';
import doctorRoutes from './doctor.routes.js';
import appointmentRoutes from './appointment.routes.js';
import recordRoutes from './record.routes.js';
import prescriptionRoutes from './prescription.routes.js';
import documentRoutes from './document.routes.js';
import billingRoutes from './billing.routes.js';
import insuranceRoutes from './insurance.routes.js';
import analyticsRoutes from './analytics.routes.js';
import auditRoutes from './audit.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/beds', bedRoutes);
router.use('/admissions', admissionRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/records', recordRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/documents', documentRoutes);
router.use('/bills', billingRoutes);
router.use('/insurance', insuranceRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/audit-logs', auditRoutes);

export default router;
