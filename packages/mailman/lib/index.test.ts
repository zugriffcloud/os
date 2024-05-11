import { describe, expect, it } from 'vitest';
import { Contact, Mail, Mailman, Message } from '$lib/index';
import { init } from 'smtp-tester';

describe('sends mails', async () => {
  const mailServer = init(4000);

  const client = new Mailman(
    process.env.ZUGRIFF_MAILMAN_TOKEN || {
      host: 'localhost',
      port: 4000,
    }
  );

  it('send plain mail with subject', async () => {
    if (!process.env.ZUGRIFF_MAILMAN_TOKEN) {
      const handler = function (_, id, email) {
        if (id != 1) return;
        expect(email.headers.to).toStrictEqual('test+ci@zugriff.eu');
        expect(email.headers.from).toStrictEqual('send+ci@zugriff.eu');
        expect(email.headers.subject).toStrictEqual('Greetings');
        expect(email.headers['content-type'].value).toStrictEqual('text/plain');
        expect(email.body).toStrictEqual('Hi Luca!');
      };
      mailServer.bind(handler);
    }

    const mail = await client.send(
      new Mail({
        to: new Contact('test+ci@zugriff.eu'),
        from: new Contact('send+ci@zugriff.eu'),
        subject: 'Greetings',
        message: new Message('Hi Luca!'),
      })
    );

    expect(mail).toMatchObject({ success: true });
  });

  it('send html mail', async () => {
    if (!process.env.ZUGRIFF_MAILMAN_TOKEN) {
      const handler = function (_, id, email) {
        if (id != 2) return;
        expect(email.headers.to).toStrictEqual(
          'test+ci@zugriff.eu, test2+ci@zugriff.eu'
        );
        expect(email.headers.from).toStrictEqual('send+ci@zugriff.eu');
        expect(email.headers.subject).toStrictEqual(undefined);
        expect(email.headers['content-type'].value).toStrictEqual('text/html');
        expect(email.html).toStrictEqual('<h1>Hi Luca!</h1>');
      };
      mailServer.bind(handler);
    }

    const mail = await client.send(
      new Mail({
        to: [
          new Contact('test+ci@zugriff.eu'),
          new Contact('test2+ci@zugriff.eu'),
        ],
        from: new Contact('send+ci@zugriff.eu'),
        message: new Message({ html: '<h1>Hi Luca!</h1>' }),
      })
    );

    expect(mail).toMatchObject({ success: true });
  });

  it('send html/ plain mail', async () => {
    if (!process.env.ZUGRIFF_MAILMAN_TOKEN) {
      const handler = function (_, id, email) {
        if (id != 3) return;
        expect(email.headers.to).toStrictEqual('test+ci@zugriff.eu');
        expect(email.headers.from).toStrictEqual('send+ci@zugriff.eu');
        expect(email.headers.subject).toStrictEqual(undefined);
        expect(email.headers['content-type'].value).toStrictEqual(
          'multipart/alternative'
        );
        expect(email.html).toStrictEqual('<h1>Hi Luca!</h1>');
        expect(email.body).toStrictEqual('Hi!');
      };
      mailServer.bind(handler);
    }

    const mail = await client.send(
      new Mail({
        to: new Contact('test+ci@zugriff.eu'),
        from: new Contact('send+ci@zugriff.eu'),
        message: new Message({ html: '<h1>Hi Luca!</h1>', plain: 'Hi!' }),
      })
    );

    expect(mail).toMatchObject({ success: true });
  });
});
