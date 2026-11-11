/* Terms of use + personal-data notice (Colombia: Ley 1581 de 2012, Decreto 1377 de 2013 compiled in
   the Decreto 1074 de 2015). Public: reachable without an account from the home screen footer. */
import type { ReactNode } from 'react';
import { FileText, ShieldCheck } from 'lucide-react';
import { Page } from '@/components/ui/Page';

const UPDATED = 'October 31, 2026';

export default function LegalPage() {
  return (
    <Page title="Terms and personal data" subtitle={`Last updated: ${UPDATED}`} back={{ to: '/', label: 'Home' }}>
      <div className="mx-auto flex max-w-[780px] flex-col gap-4 pb-10 text-[15px] leading-relaxed">
        <Block icon={<FileText size={20} />} title="Terms and conditions of use">
          <Item n="1" t="What ECYR English is">
            It is a free, non-profit project. Its only purpose is educational: to guide and support students in learning English. It is a study aid and does not replace the guidance of their teachers.
          </Item>
          <Item n="2" t="Appropriate use">
            By using it you agree to treat others with respect and to post only content suitable for a school environment (live boards, drawings, notes and games). Teachers can moderate, hide or delete content in their classes.
          </Item>
          <Item n="3" t="Content">
            The materials are our own or third-party materials credited to their authors, and are used for educational purposes only. If you own a piece of content and want it removed, let us know and we will take it down.
          </Item>
          <Item n="4" t="No warranties">
            The platform is provided as is. We work to keep it running well, but it may have faults or pauses, and some features depend on external services.
          </Item>
          <Item n="5" t="Changes">These terms may be updated; the date above shows the current version.</Item>
        </Block>

        <Block icon={<ShieldCheck size={20} />} title="Personal data handling">
          <p>
            We comply with Statutory Law 1581 of 2012 and Decree 1377 of 2013 (compiled in Decree 1074 of 2015) on personal data protection in Colombia.
          </p>
          <Item n="1" t="We do not collect data for any other purpose">
            ECYR English does not collect data for commercial, advertising or profiling purposes, does not sell or share information with third parties, and does not use advertising cookies or trackers.
          </Item>
          <Item n="2" t="The only things we store">
            Without an account, your progress stays only on your device. If you create an account, only the minimum needed to make it work is saved: name, email, role (student or teacher), your progress and whatever you choose to send to your teacher or upload to your portfolio. Only you, your teacher and the platform administrator can see it.
          </Item>
          <Item n="3" t="Voice and sensitive data">
            Recordings and everything you say into the microphone are used only during the activity and are deleted the moment you switch to another section of the app. They are not stored on our servers. Speech recognition is done by your browser (for example, Chrome uses Google services). Only what you choose to send, such as the text of an answer for your teacher, is kept.
          </Item>
          <Item n="4" t="External services">
            Some features (natural voices, AI Coach) send the necessary text to an external service only to generate the response at that moment. The platform does not store that content.
          </Item>
          <Item n="5" t="Children and teenagers">
            Because it is used by students under the age of majority, their information is handled respecting their best interests and fundamental rights (article 7 of Law 1581). We recommend that parents and guardians get to know the tool.
          </Item>
          <Item n="6" t="Your rights">
            You can access, update, correct and ask for your data to be deleted, revoke your authorisation, find out how it is used and file complaints with the Superintendence of Industry and Commerce (article 8 of Law 1581). To do so, write to your teacher or to the platform administrator: they can delete your account with all its data.
          </Item>
          <Item n="7" t="Security">Account data is stored in a restricted-access database: each person can only read what belongs to them.</Item>
        </Block>
      </div>
    </Page>
  );
}

function Block({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="bg-card shadow-card flex flex-col gap-3 rounded-[20px] p-5">
      <h2 className="text-title-3 flex items-center gap-2">{icon}{title}</h2>
      {children}
    </section>
  );
}

function Item({ n, t, children }: { n: string; t: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold">{n}. {t}</h3>
      <p className="text-label-2 mt-0.5">{children}</p>
    </div>
  );
}
