import express from 'express';
import crypto from 'crypto';
import { EnvelopeResponse } from '../middlewares/envelope';
import { Contact, Booking, Client, Settings, AILog } from '../models';
import { resolveClientId } from '../utils/resolveClient';

const router = express.Router();

/**
 * Endpoint: POST /v1/embed/forms/submit
 * Submit a form from embedded widget
 */
router.post('/forms/submit', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { formId, formName, formData } = req.body;
    const clientId = await resolveClientId(req);

    if (!clientId) {
      return envRes.sendError(401, 'UNAUTHORIZED', 'Could not identify client for form submission');
    }

    if (!formData) {
      return envRes.sendError(400, 'BAD_REQUEST', 'Form data is required');
    }

    // Create contact record from form submission
    const contact = await Contact.create({
      clientId,
      name: formData.name || 'Unknown',
      email: formData.email || 'unknown@example.com',
      phone: formData.phone || '',
      message: formData.message || JSON.stringify(formData),
      source: `embedded_form_${formId || 'unnamed'}`,
      status: 'new',
      metadata: {
        formId: formId || 'unnamed-form',
        formName: formName || 'Contact Form',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        timestamp: new Date()
      }
    });

    envRes.sendSuccess(
      {
        id: contact._id,
        message: 'Form submitted successfully'
      },
      'Form submission received'
    );
  } catch (error: any) {
    console.error('[EMBED] Form submission error:', error);
    envRes.sendError(500, 'INTERNAL_ERROR', 'Failed to process form submission');
  }
});

/**
 * Endpoint: POST /v1/embed/booking/submit
 * Create a booking from embedded widget
 */
router.post('/booking/submit', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { clientDateTime, serviceId, serviceName, guestInfo } = req.body;
    const clientId = await resolveClientId(req);

    if (!clientId) {
      return envRes.sendError(401, 'UNAUTHORIZED', 'Could not identify client');
    }

    if (!clientDateTime || !guestInfo?.email) {
      return envRes.sendError(400, 'BAD_REQUEST', 'Date, time, and guest email are required');
    }

    const booking = await Booking.create({
      clientId,
      clientDateTime: new Date(clientDateTime),
      serviceId: serviceId || 'general',
      serviceName: serviceName || 'Service',
      guestInfo: {
        name: guestInfo.name || 'Guest',
        email: guestInfo.email,
        phone: guestInfo.phone || ''
      },
      status: 'pending',
      source: 'embedded_widget',
      ipAddress: req.ip || 'unknown'
    });

    envRes.sendSuccess(
      {
        id: booking._id,
        message: 'Booking submitted successfully',
        confirmation: true
      },
      'Booking created'
    );
  } catch (error: any) {
    console.error('[EMBED] Booking submission error:', error);
    envRes.sendError(500, 'INTERNAL_ERROR', 'Failed to create booking');
  }
});

/**
 * Endpoint: GET /v1/embed/services
 * Get services for display on embedded widget
 */
router.get('/services', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = await resolveClientId(req);

    if (!clientId) {
      return envRes.sendError(401, 'UNAUTHORIZED', 'Could not identify client');
    }

    const settings = await Settings.findOne({ clientId });
    const services = settings?.services || [];

    envRes.sendSuccess(
      services.map((s: any) => ({
        id: s._id,
        name: s.name,
        description: s.description,
        duration: s.duration,
        price: s.price
      })),
      'Services retrieved'
    );
  } catch (error: any) {
    console.error('[EMBED] Services retrieval error:', error);
    envRes.sendError(500, 'INTERNAL_ERROR', 'Failed to retrieve services');
  }
});

/**
 * Endpoint: GET /v1/embed/config
 * Get client configuration for embedded widgets
 */
router.get('/config', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const clientId = await resolveClientId(req);

    if (!clientId) {
      return envRes.sendError(401, 'UNAUTHORIZED', 'Could not identify client');
    }

    const client = await Client.findOne({ clientId });
    const settings = await Settings.findOne({ clientId });

    if (!client) {
      return envRes.sendError(404, 'NOT_FOUND', 'Client not found');
    }

    envRes.sendSuccess({
      clientId,
      businessName: client.businessName,
      email: client.email,
      logo: settings?.logo,
      primaryColor: settings?.primaryColor,
      secondaryColor: settings?.secondaryColor,
      brandText: settings?.brandText,
      aiBehaviorInstructions: settings?.aiBehaviorInstructions,
      enabledFeatures: {
        chatbot: true,
        forms: true,
        booking: true,
        services: true
      }
    });
  } catch (error: any) {
    console.error('[EMBED] Config retrieval error:', error);
    envRes.sendError(500, 'INTERNAL_ERROR', 'Failed to retrieve config');
  }
});

/**
 * Endpoint: POST /v1/embed/chat/message
 * Send message through embedded chatbot
 */
router.post('/chat/message', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { sessionId, message, context } = req.body;
    const clientId = await resolveClientId(req);

    if (!clientId) {
      return envRes.sendError(401, 'UNAUTHORIZED', 'Could not identify client');
    }

    if (!message) {
      return envRes.sendError(400, 'BAD_REQUEST', 'Message is required');
    }

    // Log the chat message
    await AILog.create({
      clientId,
      sessionId: sessionId || crypto.randomUUID(),
      role: 'user',
      content: message,
      source: 'embedded_chatbot',
      context: context || {}
    });

    // In a real implementation, this would call your AI service
    // For now, return a simple response
    const response = {
      id: crypto.randomUUID(),
      sessionId: sessionId || crypto.randomUUID(),
      role: 'assistant',
      content: 'Thank you for your message. A team member will respond shortly.',
      timestamp: new Date()
    };

    // Log assistant response
    await AILog.create({
      clientId,
      sessionId: response.sessionId,
      role: 'assistant',
      content: response.content,
      source: 'embedded_chatbot'
    });

    envRes.sendSuccess(response, 'Message processed');
  } catch (error: any) {
    console.error('[EMBED] Chat error:', error);
    envRes.sendError(500, 'INTERNAL_ERROR', 'Failed to process message');
  }
});

/**
 * Endpoint: POST /v1/embed/analytics/event
 * Track analytics events from embedded widgets
 */
router.post('/analytics/event', async (req, res) => {
  const envRes = res as any as EnvelopeResponse;
  try {
    const { eventType, eventData } = req.body;
    const clientId = await resolveClientId(req);

    if (!clientId) {
      return envRes.sendError(401, 'UNAUTHORIZED', 'Could not identify client');
    }

    // Log analytics event for future dashboard analytics
    const analytics = {
      clientId,
      eventType: eventType || 'unknown',
      eventData: eventData || {},
      timestamp: new Date(),
      source: 'embedded_widget',
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    };

    // In a real implementation, save to analytics collection
    // For now, just log it
    console.log('[ANALYTICS]', analytics);

    envRes.sendSuccess(
      { recorded: true },
      'Event tracked'
    );
  } catch (error: any) {
    console.error('[EMBED] Analytics error:', error);
    envRes.sendError(500, 'INTERNAL_ERROR', 'Failed to track event');
  }
});

export default router;
