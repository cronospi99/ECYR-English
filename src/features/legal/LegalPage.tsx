/* Terms of use + personal-data notice (Colombia: Ley 1581 de 2012, Decreto 1377 de 2013 compiled in
   the Decreto 1074 de 2015). Public: reachable without an account from the home screen footer. */
import type { ReactNode } from 'react';
import { FileText, ShieldCheck } from 'lucide-react';
import { Page } from '@/components/ui/Page';

const UPDATED = '31 de octubre de 2026';

export default function LegalPage() {
  return (
    <Page title="Términos y datos personales" subtitle={`Última actualización: ${UPDATED}`} back={{ to: '/', label: 'Inicio' }}>
      <div className="mx-auto flex max-w-[780px] flex-col gap-4 pb-10 text-[15px] leading-relaxed">
        <Block icon={<FileText size={20} />} title="Términos y condiciones de uso">
          <Item n="1" t="Qué es ECYR English">
            Es un proyecto libre, gratuito y sin ánimo de lucro. Su único propósito es educativo: orientar y acompañar a los estudiantes en su aprendizaje de inglés. Es
            una herramienta de apoyo al estudio y no reemplaza la guía de sus docentes.
          </Item>
          <Item n="2" t="Uso adecuado">
            Al usarla te comprometes a tratar con respeto a los demás y a publicar solo contenido apropiado para un ambiente escolar (muros en vivo, dibujos, notas y juegos). Los
            docentes pueden moderar, ocultar o borrar contenido de sus clases.
          </Item>
          <Item n="3" t="Contenidos">
            Los materiales son propios o de terceros que se citan con sus créditos, y se usan solo con fines educativos. Si eres titular de un contenido y quieres que se retire,
            avísanos y lo quitaremos.
          </Item>
          <Item n="4" t="Sin garantías">
            La plataforma se ofrece tal como está. Trabajamos para que funcione bien, pero puede tener fallas o pausas, y algunas funciones dependen de servicios externos.
          </Item>
          <Item n="5" t="Cambios">Estos términos pueden actualizarse; la fecha de arriba indica la versión vigente.</Item>
        </Block>

        <Block icon={<ShieldCheck size={20} />} title="Tratamiento de datos personales">
          <p>
            Cumplimos la Ley Estatutaria 1581 de 2012 y el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) sobre protección de datos personales en Colombia.
          </p>
          <Item n="1" t="No recopilamos datos con otros fines">
            ECYR English no recopila datos con fines comerciales, publicitarios ni de perfilamiento, no vende ni comparte información con terceros y no usa cookies de
            publicidad ni rastreadores.
          </Item>
          <Item n="2" t="Lo único que se guarda">
            Sin cuenta, tu progreso queda solo en tu dispositivo. Si creas una cuenta, se guarda lo mínimo para que funcione: nombre, correo, rol (estudiante o docente), tu
            progreso y lo que tú decidas enviar a tu docente o subir a tu portafolio. Solo tú, tu docente y el administrador de la plataforma pueden verlo.
          </Item>
          <Item n="3" t="Voz y datos sensibles">
            Las grabaciones y todo lo que dices al micrófono se usan solo durante la actividad y se eliminan en el momento en que cambias a otra sección de la aplicación. No se
            guardan en nuestros servidores. El reconocimiento de voz lo hace tu navegador (por ejemplo, Chrome usa servicios de Google). Solo se conserva lo que tú decidas
            enviar, como el texto de una respuesta para tu docente.
          </Item>
          <Item n="4" t="Servicios externos">
            Algunas funciones (voces naturales, AI Coach) envían el texto necesario a un servicio externo solo para generar la respuesta en ese momento. La plataforma no
            guarda ese contenido.
          </Item>
          <Item n="5" t="Niñas, niños y adolescentes">
            Como la usan estudiantes menores de edad, su información se trata respetando su interés superior y sus derechos fundamentales (artículo 7 de la Ley 1581).
            Recomendamos que padres y acudientes conozcan la herramienta.
          </Item>
          <Item n="6" t="Tus derechos">
            Puedes conocer, actualizar, rectificar y pedir que se borren tus datos, revocar tu autorización, saber cómo se usan y presentar quejas ante la Superintendencia de
            Industria y Comercio (artículo 8 de la Ley 1581). Para hacerlo, escríbele a tu docente o al administrador de la plataforma: puede eliminar tu cuenta con todos
            sus datos.
          </Item>
          <Item n="7" t="Seguridad">Los datos de las cuentas se guardan en una base de datos con acceso restringido: cada persona solo puede leer lo que le corresponde.</Item>
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
