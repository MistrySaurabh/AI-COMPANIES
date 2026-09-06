import Imap from 'node-imap';
import { simpleParser } from 'mailparser';
import Company from '../models/Company';
import EmailLog from '../models/EmailLog';

export interface BounceCheckResult {
  bounceEmailsFound: number;
  companiesDeactivated: number;
  failedEmails: string[];
  errors: string[];
}

// Extract the failed recipient email from Gmail bounce notification text/body
function extractFailedEmail(text: string, senderEmail: string): string | null {
  const patterns = [
    /delivering your message to\s+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i,
    /your message to\s+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i,
    /Final-Recipient:\s*rfc822;\s*([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i,
    /Original-Recipient:\s*rfc822;\s*([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const email = match[1].toLowerCase();
      if (email !== senderEmail.toLowerCase()) {
        return email;
      }
    }
  }
  return null;
}

// Fetch raw messages matching a search criteria via node-imap (Promise-based wrapper)
function fetchBounceMessages(
  gmailUser: string,
  gmailAppPassword: string
): Promise<Buffer[]> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: gmailUser,
      password: gmailAppPassword,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    const messages: Buffer[] = [];

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        if (err) { imap.end(); return reject(err); }

        // Search for unseen bounce notifications
        imap.search(
          [
            'UNSEEN',
            ['OR',
              ['FROM', 'mailer-daemon@googlemail.com'],
              ['SUBJECT', 'Delivery incomplete'],
            ],
          ],
          (searchErr, uids) => {
            if (searchErr) { imap.end(); return reject(searchErr); }

            if (!uids || uids.length === 0) {
              imap.end();
              return resolve([]);
            }

            const fetch = imap.fetch(uids, { bodies: '', markSeen: true });

            fetch.on('message', (msg) => {
              const chunks: Buffer[] = [];
              msg.on('body', (stream) => {
                stream.on('data', (chunk: Buffer) => chunks.push(chunk));
                stream.once('end', () => {
                  messages.push(Buffer.concat(chunks));
                });
              });
            });

            fetch.once('error', (fetchErr) => { imap.end(); reject(fetchErr); });
            fetch.once('end', () => imap.end());
          }
        );
      });
    });

    imap.once('error', reject);
    imap.once('end', () => resolve(messages));
    imap.connect();
  });
}

export const checkAndProcessBounces = async (
  gmailUser: string,
  gmailAppPassword: string
): Promise<BounceCheckResult> => {
  const result: BounceCheckResult = {
    bounceEmailsFound: 0,
    companiesDeactivated: 0,
    failedEmails: [],
    errors: [],
  };

  const rawMessages = await fetchBounceMessages(gmailUser, gmailAppPassword);
  result.bounceEmailsFound = rawMessages.length;

  for (const raw of rawMessages) {
    try {
      const parsed = await simpleParser(raw);

      // Build searchable text from subject + text body + html body
      const searchText = [
        parsed.subject ?? '',
        parsed.text ?? '',
        parsed.html ?? '',
      ].join('\n');

      const failedEmail = extractFailedEmail(searchText, gmailUser);
      if (!failedEmail) continue;

      // Find active company with this email
      const company = await Company.findOne({
        $or: [
          { hrEmail: { $regex: new RegExp(`^${failedEmail}$`, 'i') } },
          { email: { $regex: new RegExp(`^${failedEmail}$`, 'i') } },
        ],
        isActive: true,
      });

      if (company) {
        await Company.updateOne(
          { _id: company._id },
          { $set: { isActive: false } }
        );

        // Update email log from 'sent' → 'failed'
        await EmailLog.updateMany(
          { recipientEmail: failedEmail, status: 'sent' },
          {
            $set: {
              status: 'failed',
              errorMessage: 'Delivery incomplete — bounce notification received from Gmail',
            },
          }
        );

        result.companiesDeactivated++;
        result.failedEmails.push(failedEmail);
      }
    } catch (msgError: any) {
      result.errors.push(`Error processing bounce message: ${msgError.message}`);
    }
  }

  return result;
};
