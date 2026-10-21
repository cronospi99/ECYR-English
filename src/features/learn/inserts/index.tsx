import { lazy, Suspense, type ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { GtleSlug } from './Gtle';

/**
 * Interactive pieces placed inside the lessons where they are taught:
 * family photos, the family tree, frequency tools, countries and
 * nationalities, weather, clothes verbs, spelling and the Games to Learn
 * English games. Each is code-split and loaded only by the lesson that uses it.
 */
const FamilyPhotos = lazy(() => import('./FamilyPhotos').then((m) => ({ default: m.FamilyPhotos })));
const FamilyTreePuzzle = lazy(() => import('./FrequencyFamily').then((m) => ({ default: m.FamilyTreePuzzle })));
const FrequencyTools = lazy(() => import('./FrequencyFamily').then((m) => ({ default: m.FrequencyTools })));
const CountriesNationalities = lazy(() => import('./Themes').then((m) => ({ default: m.CountriesNationalities })));
const SpellingDictation = lazy(() => import('./Themes').then((m) => ({ default: m.SpellingDictation })));
const WeatherLesson = lazy(() => import('./Themes').then((m) => ({ default: m.WeatherLesson })));
const WearingVerbs = lazy(() => import('./Themes').then((m) => ({ default: m.WearingVerbs })));
const CityPlaces = lazy(() => import('./CityHealthHomes').then((m) => ({ default: m.CityPlaces })));
const HealthAdvice = lazy(() => import('./CityHealthHomes').then((m) => ({ default: m.HealthAdvice })));
const HousingCompare = lazy(() => import('./CityHealthHomes').then((m) => ({ default: m.HousingCompare })));
const GtleGame = lazy(() => import('./Gtle').then((m) => ({ default: m.GtleGame })));

type Insert = () => ReactNode;
const game = (slug: GtleSlug): Insert => () => <GtleGame slug={slug} />;

/** "<level>-<unit>:<section>" → what that lesson tab gets, in order. */
const UNIT_INSERTS: Record<string, Insert[]> = {
  'A1-1:vocab': [() => <CountriesNationalities />, () => <SpellingDictation />, game('jobs')],
  'A1-1:grammar': [game('questions')],
  'A1-2:grammar': [game('daily-routines')],
  'A1-3:grammar': [() => <HousingCompare />, game('comparatives')],
  'A1-5:vocab': [() => <FamilyPhotos />, () => <FamilyTreePuzzle />],
  'A1-6:grammar': [() => <FrequencyTools />],
  'A1-8:vocab': [() => <CityPlaces />],
  'A1-8:grammar': [game('prepositions-game')],
  'A1-11:grammar': [() => <HealthAdvice />],
  'A1-9:vocab': [() => <FamilyPhotos only={['family-garden', 'family-living-room']} />, () => <WearingVerbs />, game('clothes-game')],
  'A1-14:vocab': [() => <CountriesNationalities />, () => <WeatherLesson />, game('weather')],
  'A1-14:grammar': [() => <HousingCompare />, game('comparatives')],
  'A2-3:grammar': [() => <HousingCompare />],
  'A2-5:vocab': [() => <WeatherLesson />, game('weather')],
  'A2-5:grammar': [() => <HealthAdvice />],
  'B1-2:grammar': [() => <HousingCompare start={1} />],
  'B1-8:grammar': [() => <HousingCompare start={1} />],
  'B2-1:vocab': [() => <FamilyPhotos only={['family-multicultural']} />],
};

/** Pre-A1 topics (/learn/foundations/<id>). */
const TOPIC_INSERTS: Record<string, Insert[]> = {
  alphabet: [() => <SpellingDictation />],
  'verb-be': [() => <CountriesNationalities />],
  'wh-questions': [game('questions')],
  clothing: [() => <WearingVerbs groups={false} />, game('clothes-game')],
  'possessive-s': [() => <FamilyPhotos />],
};

function Inserts({ list, title }: { list: Insert[] | undefined; title: string }) {
  if (!list?.length) return null;
  return (
    <section className="mt-8">
      <h3 className="text-title-2 mb-3 flex items-center gap-2 px-1">
        <Sparkles size={22} className="text-ink-purple" /> {title}
      </h3>
      <Suspense fallback={<Card className="text-label-2 p-6 text-center">Cargando actividades…</Card>}>
        <div className="space-y-5">
          {list.map((Render, i) => (
            <div key={i}>{Render()}</div>
          ))}
        </div>
      </Suspense>
    </section>
  );
}

export function UnitInserts({ unitKey, section }: { unitKey: string; section: 'vocab' | 'grammar' }) {
  return <Inserts list={UNIT_INSERTS[`${unitKey}:${section}`]} title={section === 'vocab' ? 'Explora y practica' : 'Practica jugando'} />;
}

export function TopicInserts({ topicId }: { topicId: string }) {
  return <Inserts list={TOPIC_INSERTS[topicId]} title="Más para practicar" />;
}
