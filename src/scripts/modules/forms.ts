import {
  hasErrors,
  validateContact,
  validateInvestment,
  type ContactMessages,
  type InvestmentMessages,
} from '../../lib/validation';
import { toast } from '../toast';
import { $, $$, readJson } from '../utils';

function showErrors(form: HTMLFormElement, errors: Record<string, string | undefined>): void {
  $$('[data-error-for]', form).forEach((el) => {
    const field = el.getAttribute('data-error-for') ?? '';
    el.textContent = errors[field] ?? '';
  });

  const first = Object.keys(errors)[0];
  if (first) {
    const control = form.elements.namedItem(first);
    const target = control instanceof RadioNodeList ? control[0] : control;
    if (target instanceof HTMLElement) target.focus();
  }
}

function setSubmitting(form: HTMLFormElement, submitting: boolean, sending: string, idle: string) {
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const label = form.querySelector<HTMLElement>('[data-submit-label]');
  if (button) button.disabled = submitting;
  if (label) label.textContent = submitting ? sending : idle;
}

/** Site-wide contact form: LeadConnector webhook + EmailJS, exactly as before. */
export function initContactForm(): void {
  const form = $<HTMLFormElement>('[data-contact-form]');
  if (!form) return;

  const messages = readJson<ContactMessages & { success_title: string; success: string; fail_title: string; sending: string; send: string }>(
    form,
    'data-messages',
    {} as never,
  );
  const webhook = form.dataset.webhook ?? '';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);

    const values = {
      username: String(data.get('username') ?? ''),
      email: String(data.get('email') ?? ''),
      phone: String(data.get('phone') ?? ''),
      findUs: String(data.get('findUs') ?? ''),
      investingWithUs: String(data.get('investingWithUs') ?? ''),
      message: String(data.get('message') ?? ''),
      terms: data.get('terms') === 'on',
    };

    const errors = validateContact(values, messages);
    showErrors(form, errors);
    if (hasErrors(errors)) return;

    setSubmitting(form, true, messages.sending, messages.send);

    // Two independent delivery paths. One succeeding is enough to tell the
    // visitor we have their message; both failing must not.
    let delivered = false;

    try {
      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: values.username,
          email: values.email,
          phone: values.phone,
          source: values.findUs,
          investment_reason: values.investingWithUs,
          message: values.message,
        }),
      });
      // A 4xx or 5xx is a lead that never arrived. Reading the status is the
      // difference between knowing that and telling the visitor "we'll be in
      // touch" over a message nobody received.
      if (response.ok) delivered = true;
      else console.warn(`[ddc] lead webhook responded ${response.status}`);
    } catch (error) {
      console.warn('[ddc] lead webhook unreachable', error);
    }

    const serviceId = import.meta.env.PUBLIC_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.PUBLIC_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.PUBLIC_EMAILJS_PUBLIC_KEY;

    if (serviceId && templateId && publicKey) {
      try {
        const emailjs = (await import('@emailjs/browser')).default;
        await emailjs.sendForm(serviceId, templateId, form, { publicKey });
        delivered = true;
      } catch (error) {
        console.warn('[ddc] EmailJS delivery failed', error);
      }
    }

    if (delivered) {
      form.reset();
      showErrors(form, {});
      toast.success(messages.success_title, { description: messages.success });
    } else {
      // The fields keep their values, so the visitor can retry without
      // retyping — or reach us by the phone number and email above.
      toast.error(messages.fail_title);
    }

    setSubmitting(form, false, messages.sending, messages.send);
  });
}

/** Investor dialog: webhook post, then hand off to WhatsApp with a summary. */
export function initInvestmentDialog(): void {
  const dialog = $<HTMLDialogElement>('[data-investment-dialog]');
  if (!dialog) return;

  const form = $<HTMLFormElement>('[data-investment-form]', dialog);
  const titleEl = $<HTMLElement>('[data-investment-title]', dialog);
  const titleInput = $<HTMLInputElement>('[data-investment-title-input]', dialog);
  const closeBtn = $<HTMLButtonElement>('[data-close-investment-dialog]', dialog);

  const messages = readJson<InvestmentMessages & { fail_title: string; sending: string; send: string }>(
    dialog,
    'data-messages',
    {} as never,
  );

  document.addEventListener('click', (event) => {
    const trigger = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      '[data-open-investment-dialog]',
    );
    if (!trigger) return;

    // `investments.json` stores `"Miami Premium "`; the CRM should not.
    const title = (trigger.dataset.openInvestmentDialog ?? '').trim();
    if (titleEl) titleEl.textContent = title;
    if (titleInput) titleInput.value = title;
    form?.reset();
    if (form) showErrors(form, {});
    if (!dialog.open) dialog.showModal();
  });

  closeBtn?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);

    const values = {
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      phone: String(data.get('phone') ?? ''),
      country: String(data.get('country') ?? ''),
      budget: String(data.get('budget') ?? ''),
      funds: String(data.get('funds') ?? ''),
      company: String(data.get('company') ?? ''),
    };

    const errors = validateInvestment(values, messages);
    showErrors(form, errors);
    if (hasErrors(errors)) return;

    setSubmitting(form, true, messages.sending, messages.send);
    const investmentTitle = titleInput?.value ?? '';

    try {
      await fetch(dialog.dataset.webhook ?? '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_name: values.name,
          email: values.email,
          phone: values.phone,
          country: values.country,
          investment_title: investmentTitle,
          budget: values.budget,
          funds: values.funds,
          company: values.company,
          source: 'investments_inside_dialog',
        }),
      });

      const message = [
        'Hola, me gustaría recibir más información sobre inversiones.',
        '',
        '📌 *Datos proporcionados:*',
        `- Nombre: ${values.name}`,
        `- País: ${values.country}`,
        `- Email: ${values.email}`,
        `- Teléfono: ${values.phone}`,
        `- Proyecto: ${investmentTitle}`,
        `- Presupuesto estimado: ${values.budget}`,
        `- Fondos disponibles: ${values.funds}`,
        `- Empresa registrada en US: ${values.company}`,
      ].join('\n');

      const phone = dialog.dataset.whatsapp ?? '';
      window.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      dialog.close();
      form.reset();
    } catch {
      toast.error(messages.fail_title);
    } finally {
      setSubmitting(form, false, messages.sending, messages.send);
    }
  });
}
