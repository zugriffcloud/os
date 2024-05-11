type MailmanConfiguration = import('nodemailer/lib/smtp-connection').Options;
type MailmanProxyConfiguration = { token: string; proxy?: string };

type MailmanResultType =
  | { anchor: string; success: boolean }
  | { error: string };

export class Mailman {
  #token: string;
  #proxy = 'https://proxy.zugriff.eu/api/v1/smtp';

  #options: MailmanConfiguration;
  #client: import('nodemailer').Transporter;

  constructor(
    config: string | MailmanProxyConfiguration | MailmanConfiguration
  ) {
    if (config instanceof String && typeof config == 'string') {
      this.#token = config;
      return;
    } else if (typeof config == 'object' && 'token' in config) {
      this.#token = config.token;
      this.#proxy = config.proxy ?? this.#proxy;
    } else if (typeof config == 'object' && !('token' in config)) {
      this.#options = config;
    }
  }

  async #init() {
    if (!this.#client) {
      const nodemailer = await import('nodemailer');
      this.#client = nodemailer.createTransport(this.#options);
    }
  }

  async send(
    mail: Mail
  ): Promise<Exclude<MailmanResultType, { error: string }>> {
    if (this.#options) {
      await this.#init();

      try {
        await this.#client.sendMail({
          to: Array.isArray(mail.to)
            ? mail.to.map((address) => address.internalNodemailerAddress())
            : mail.to?.internalNodemailerAddress(),
          from: mail.from.internalNodemailerAddress(),
          bcc: Array.isArray(mail.bcc)
            ? mail.bcc.map((address) => address.internalNodemailerAddress())
            : mail.bcc?.internalNodemailerAddress(),
          cc: Array.isArray(mail.cc)
            ? mail.cc.map((address) => address.internalNodemailerAddress())
            : mail.cc?.internalNodemailerAddress(),
          replyTo: mail.reply?.internalNodemailerAddress(),
          subject: mail.subject,
          html: mail.message.html,
          text: mail.message.plain,
        });
      } catch (error) {
        if (error instanceof Error) {
          throw { anchor: 'LOCAL', error: error.toString() };
        } else {
          throw error;
        }
      }

      return { anchor: 'LOCAL', success: true };
    }

    const response = await fetch(this.#proxy, {
      method: 'POST',
      body: JSON.stringify({
        to: Array.of(mail.to)
          .filter(Boolean)
          .flat(1)
          .map((c) => c.internalProxyContact()),
        from: mail.from.internalProxyContact(),
        bcc: Array.of(mail.bcc)
          .filter(Boolean)
          .flat(1)
          .map((c) => c.internalProxyContact()),
        cc: Array.of(mail.cc)
          .filter(Boolean)
          .flat(1)
          .map((c) => c.internalProxyContact()),
        reply: mail.reply?.internalProxyContact(),
        subject: mail.subject,
        plain: mail.message?.plain,
        html: mail.message?.html,
      }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + this.#token,
      },
    });

    const result = await response.json();

    if ('error' in result) {
      throw result;
    }

    return result;
  }
}

export class Contact {
  name: string | undefined = undefined;
  address: string;

  constructor(contact: { address: string; name?: string } | string) {
    if (typeof contact == 'string') {
      this.address = contact;
    } else {
      this.name = contact.name;
      this.address = contact.address;
    }
  }

  internalNodemailerAddress():
    | import('nodemailer/lib/mailer/index').Address
    | string {
    return this.name != undefined
      ? { name: this.name, address: this.address }
      : this.address;
  }

  internalProxyContact(): { name: string | undefined; address: string } {
    return {
      name: this.name,
      address: this.address,
    };
  }
}

export class Message {
  plain: string | undefined = undefined;
  html: string | undefined = undefined;

  constructor(message: { html?: string; plain?: string } | string) {
    if (typeof message == 'string') {
      this.plain = message;
    } else {
      this.html = message.html;
      this.plain = message.plain;
    }
  }
}

export class Mail {
  to: Contact | Contact[];
  from: Contact;
  reply?: Contact | undefined = undefined;
  cc?: Contact | Contact[] = [];
  bcc?: Contact | Contact[] = [];
  subject?: string = undefined;
  message?: Message = undefined;

  constructor(mail: {
    to: Contact | Contact[];
    from: Contact;
    reply?: Contact;
    cc?: Contact | Contact[];
    bcc?: Contact | Contact;
    subject?: string;
    message?: Message;
  }) {
    this.to = mail.to;
    this.from = mail.from;
    this.reply = mail.reply;
    this.cc = mail.cc;
    this.bcc = mail.bcc;
    this.subject = mail.subject;
    this.message = mail.message;
  }
}
