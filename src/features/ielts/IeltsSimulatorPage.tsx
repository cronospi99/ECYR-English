import { ModuleFrame } from '@/components/learning/ModuleFrame';
import { IELTS_APP_SRC } from '@/content/catalog';

export default function IeltsSimulatorPage() {
  return <ModuleFrame src={IELTS_APP_SRC} title="IELTS Simulator" backTo="/ielts" accent="var(--indigo)" />;
}
