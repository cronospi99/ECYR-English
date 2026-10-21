import { lazy, Suspense, type ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import type { GtleSlug } from './Gtle';
import type { CefrLevel } from '@/content/types';

/**
 * Interactive pieces placed inside the lessons where they are taught:
 * family photos, the family tree, frequency tools, countries and
 * nationalities, weather, clothes verbs, spelling, the Games to Learn
 * English games and the picture-card lessons of Vocabulario visual (every
 * CEFR level). Each is code-split and loaded only by the lesson that uses it.
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
const VisualVocabInsert = lazy(() => import('./VisualVocabInsert').then((m) => ({ default: m.VisualVocabInsert })));

type Insert = () => ReactNode;
const game = (slug: GtleSlug): Insert => () => <GtleGame slug={slug} />;
/** A picture-card lesson from Práctica › Vocabulario › Vocabulario visual (src/content/generated/vocab-visual-<level>.json). */
const visual = (level: CefrLevel, topic: string): Insert => () => <VisualVocabInsert level={level} topic={topic} />;

/** "<level>-<unit>:<section>" → what that lesson tab gets, in order. */
const UNIT_INSERTS: Record<string, Insert[]> = {
  // A1
  'A1-1:vocab': [() => <CountriesNationalities />, visual('A1', 'family'), () => <SpellingDictation />, game('jobs')],
  'A1-1:grammar': [game('questions')],
  'A1-2:grammar': [game('daily-routines')],
  'A1-3:vocab': [visual('A1', 'clothes')],
  'A1-3:grammar': [() => <HousingCompare />, game('comparatives')],
  'A1-5:vocab': [() => <FamilyPhotos />, visual('A1', 'house'), () => <FamilyTreePuzzle />],
  'A1-6:grammar': [() => <FrequencyTools />],
  'A1-8:vocab': [visual('A1', 'city'), visual('A1', 'prepositions-place')],
  'A1-8:grammar': [game('prepositions-game')],
  'A1-9:vocab': [() => <FamilyPhotos only={['family-garden', 'family-living-room']} />, () => <WearingVerbs />, game('clothes-game')],
  'A1-11:grammar': [() => <HealthAdvice />],
  'A1-14:vocab': [() => <WeatherLesson />, game('weather')],
  'A1-14:grammar': [() => <HousingCompare />, game('comparatives')],
  // A2
  'A2-2:vocab': [visual('A2', 'shops-services'), () => <CityPlaces />],
  'A2-3:grammar': [() => <HousingCompare />],
  'A2-5:vocab': [visual('A2', 'forecast'), game('weather')],
  'A2-5:grammar': [() => <HealthAdvice />],
  'A2-7:vocab': [visual('A2', 'prepositions-movement')],
  'A2-10:vocab': [visual('A2', 'clothes-seasons')],
  'A2-12:vocab': [visual('A2', 'health')],
  'A2-13:vocab': [visual('A2', 'colombian-clothing')],
  // B1
  'B1-2:grammar': [() => <HousingCompare start={1} />],
  'B1-5:vocab': [visual('B1', 'fashion-style')],
  'B1-7:vocab': [visual('B1', 'extreme-weather')],
  'B1-8:grammar': [() => <HousingCompare start={1} />],
  'B1-11:vocab': [visual('B1', 'travel-geography')],
  'B1-15:vocab': [visual('B1', 'city-problems')],
  // B2
  'B2-1:vocab': [() => <FamilyPhotos only={['family-multicultural']} />],
  'B2-3:vocab': [visual('B2', 'urban-planning')],
  'B2-5:vocab': [visual('B2', 'weather-idioms')],
  'B2-6:vocab': [visual('B2', 'climate-change')],
  'B2-11:vocab': [visual('B2', 'fashion-industry')],
  // C1
  'C1-2:vocab': [visual('C1', 'fashion-criticism')],
  'C1-7:vocab': [visual('C1', 'architecture')],
  'C1-9:vocab': [visual('C1', 'weather-metaphors')],
  'C1-10:vocab': [visual('C1', 'geopolitics-identity')],
  // C2
  'C2-1:vocab': [visual('C2', 'identity-belonging')],
  'C2-6:vocab': [visual('C2', 'nature-idioms')],
  'C2-7:vocab': [visual('C2', 'arts-criticism')],
};

/** Pre-A1 topics (/learn/foundations/<id>). */
const TOPIC_INSERTS: Record<string, Insert[]> = {
  alphabet: [visual('A1', 'alphabet'), () => <SpellingDictation />],
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
