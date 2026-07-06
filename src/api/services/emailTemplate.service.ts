import { EmailTemplate, Settings } from '../models';
import { sendEmail } from '../email';

export class EmailTemplateService {
  /**
   * Create a new email template
   */
  static async createTemplate(clientId: string, data: any) {
    const template = await EmailTemplate.create({
      clientId,
      name: data.name,
      description: data.description,
      category: data.category || 'General',
      tags: data.tags || [],
      type: data.type || 'user',
      subject: data.subject || '',
      projectData: data.projectData || null,
      htmlSource: data.htmlSource || '',
      mjmlSource: data.mjmlSource || '',
      thumbnail: data.thumbnail || '',
      variables: data.variables || [],
      isMarketplace: data.isMarketplace || false,
      isPremium: data.isPremium || false,
      price: data.price || 0,
      createdBy: data.createdBy || 'system',
      status: data.status || 'draft'
    });
    return template;
  }

  /**
   * Update an existing email template
   */
  static async updateTemplate(clientId: string, templateId: string, data: any) {
    const template = await EmailTemplate.findOneAndUpdate(
      { _id: templateId, clientId },
      {
        $set: {
          name: data.name,
          description: data.description,
          category: data.category,
          tags: data.tags,
          type: data.type,
          subject: data.subject,
          projectData: data.projectData,
          htmlSource: data.htmlSource,
          mjmlSource: data.mjmlSource,
          thumbnail: data.thumbnail,
          variables: data.variables,
          isMarketplace: data.isMarketplace,
          isPremium: data.isPremium,
          price: data.price,
          status: data.status,
          updatedBy: data.updatedBy || 'system'
        }
      },
      { new: true }
    );
    if (!template) {
      throw new Error('Template not found');
    }
    return template;
  }

  /**
   * Delete an email template
   */
  static async deleteTemplate(clientId: string, templateId: string) {
    const result = await EmailTemplate.deleteOne({ _id: templateId, clientId });
    if (result.deletedCount === 0) {
      throw new Error('Template not found');
    }
    return { success: true };
  }

  /**
   * Duplicate an email template
   */
  static async duplicateTemplate(clientId: string, templateId: string) {
    const original = await EmailTemplate.findOne({ _id: templateId, clientId }).lean();
    if (!original) {
      throw new Error('Original template not found');
    }

    const duplicatedData = {
      ...original,
      _id: undefined,
      name: `${original.name} (Copy)`,
      status: 'draft',
      createdAt: undefined,
      updatedAt: undefined
    };

    const duplicate = await EmailTemplate.create(duplicatedData);
    return duplicate;
  }

  /**
   * Compile MJML into standard HTML with lazy loaded compiler
   */
  static async compileMjml(mjmlCode: string): Promise<{ html: string; errors: any[] }> {
    try {
      const mjml2html = (await import('mjml')).default as any;
      const result = mjml2html(mjmlCode, {
        validationLevel: 'soft',
        minify: false
      }) as any;
      return {
        html: result.html,
        errors: result.errors || []
      };
    } catch (err: any) {
      console.error('MJML compile failure:', err);
      return {
        html: '',
        errors: [{ message: err.message || 'Fatal MJML syntax / loading error' }]
      };
    }
  }

  /**
   * Render variables using Handlebars compiler
   */
  static async renderHandlebars(templateContent: string, variables: Record<string, any>): Promise<string> {
    try {
      const Handlebars = (await import('handlebars')).default;
      const compiled = Handlebars.compile(templateContent);
      return compiled(variables);
    } catch (err: any) {
      console.error('Handlebars rendering failure:', err);
      return templateContent; // Fallback to raw string
    }
  }

  /**
   * Generate preview with demo context values filled
   */
  static async previewTemplate(clientId: string, templateId: string, demoVariables?: Record<string, any>) {
    const template = await EmailTemplate.findOne({ _id: templateId, clientId }).lean();
    if (!template) {
      throw new Error('Template not found');
    }

    let source = template.htmlSource || '';
    if (template.mjmlSource) {
      const compiled = await this.compileMjml(template.mjmlSource);
      source = compiled.html || source;
    }

    const defaultVariables = {
      full_name: 'Alice Smith',
      first_name: 'Alice',
      last_name: 'Smith',
      email: 'alice.smith@example.com',
      phone: '+1-555-019-2834',
      whatsapp_number: '+15550192834',
      telegram_username: '@alice_smith',
      company_name: 'OminiRep Corp',
      business_name: 'OminiRep Solutions',
      booking_date: '2026-07-15',
      booking_time: '10:00 AM',
      service_name: 'AI Onboarding Advisory',
      agent_name: 'Rep Agent Marcus',
      lead_score: '85',
      lead_source: 'WhatsApp Organic',
      inquiry_subject: 'Pricing Models Query',
      inquiry_message: 'Hi, I would like to query about custom tenant billing options.',
      unsubscribe_link: 'https://ominirep.com/unsubscribe?email=john.doe%40example.com',
      website_url: 'https://ominirep.com',
      support_email: 'support@ominirep.com',
      support_phone: '+1-800-555-OMNI'
    };

    const variablesToRender = {
      ...defaultVariables,
      ...(demoVariables || {})
    };

    const renderedHtml = await this.renderHandlebars(source, variablesToRender);
    const renderedSubject = await this.renderHandlebars(template.subject || '', variablesToRender);

    return {
      template,
      renderedHtml,
      renderedSubject
    };
  }

  /**
   * Send test email using configured SMTP settings or simulated fallback
   */
  static async sendTestEmail(
    clientId: string,
    to: string,
    subject: string,
    templateId: string,
    customVariables?: Record<string, any>,
    overrideSmtpConfig?: any
  ) {
    const { renderedHtml, renderedSubject } = await this.previewTemplate(clientId, templateId, customVariables);

    // Call the application email mechanism (sendEmail)
    // If SMTP is unconfigured, it auto-registers as simulation inside UnifiedMessage
    const sendResult = await sendEmail(
      to,
      subject || renderedSubject || 'OminiRep Email Test',
      'Please enable HTML rendering to view this template.',
      renderedHtml,
      clientId,
      overrideSmtpConfig
    );

    return {
      ...sendResult,
      subject: subject || renderedSubject,
      to
    };
  }

  /**
   * Export template structure as plain JSON payload
   */
  static async exportTemplate(clientId: string, templateId: string) {
    const template = await EmailTemplate.findOne({ _id: templateId, clientId }).lean();
    if (!template) {
      throw new Error('Template not found');
    }
    return {
      name: template.name,
      description: template.description,
      category: template.category,
      tags: template.tags,
      type: template.type,
      subject: template.subject,
      projectData: template.projectData,
      htmlSource: template.htmlSource,
      mjmlSource: template.mjmlSource,
      thumbnail: template.thumbnail,
      variables: template.variables,
      isMarketplace: template.isMarketplace,
      isPremium: template.isPremium,
      price: template.price,
      status: template.status
    };
  }

  /**
   * Import template structure from uploaded plain JSON payload
   */
  static async importTemplate(clientId: string, templateData: any) {
    if (!templateData.name) {
      throw new Error('Template name is required in imported payload.');
    }
    return await this.createTemplate(clientId, {
      ...templateData,
      status: 'draft'
    });
  }
}
