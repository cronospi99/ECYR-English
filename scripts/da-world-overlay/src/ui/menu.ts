import { missionsFor } from "../game/missions";
import { MODES, type GameMode, type GameModeId } from "../game/modes";
import { QUALITY, type QualityName } from "../core/quality";
import { slotMissions, type GameState } from "../game/state";
import { el } from "./dom";

/**
 * The front door — rewritten for ECYR English by scripts/import-da-world.mjs.
 *
 * One question: what do you want to practise? Three big cards go straight into
 * the city in that mode; the teacher-led class (QR) is a smaller entry under
 * them. Your character and the graphics level are two small links, never a
 * step you have to pass. Everything else the old menu had is reachable where
 * it is used: the missions are 🎯 in the city (and only the chosen mode's),
 * the race and the class goal are in the teacher panel (👩‍🏫, for whoever runs
 * a class), and the character is also in the lobby and in the city's ? card.
 */

export interface MenuHandlers {
  onStart(mode: GameMode): void;
  onQuality(name: QualityName): void;
  onTeacher(): void;
  /** Open the character customiser. */
  onCharacter(): void;
  /** How many missions win the match. 0 is no race. */
  onSetTarget(missions: number): void;
  /** ECYR rebuild: open Taxi Rush. */
  onTaxi?(): void;
}

const CARDS: { id: GameModeId; line: string }[] = [
  {
    id: "vocabulary",
    line: "Lugares de la ciudad, there is / there are, some / any, much / many y preposiciones de lugar.",
  },
  {
    id: "directions",
    line: "Da indicaciones a turistas perdidos: go straight on, turn left / right y cuenta las cuadras.",
  },
  {
    id: "detective",
    line: "Adverbios de frecuencia y la familia: reúne pistas por la ciudad y descubre quién se esconde.",
  },
];

const QUALITY_ES: Record<QualityName, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  ultra: "Ultra",
};

export class Menu {
  private readonly root: HTMLElement;
  private readonly counts = new Map<GameModeId, HTMLElement>();
  private readonly qualityButton: HTMLButtonElement;
  private quality: QualityName;

  constructor(
    parent: HTMLElement,
    _state: GameState,
    quality: QualityName,
    _target: number,
    private readonly handlers: MenuHandlers,
  ) {
    this.quality = quality;

    const cards = CARDS.map(({ id, line }) => {
      const mode = MODES[id];
      const count = el("span", { class: "ecyr-card-count" });
      this.counts.set(id, count);
      const card = el("button", { class: "ecyr-card ecyr-card-" + id, type: "button", "data-mode": id }, [
        el("span", { class: "ecyr-card-icon", text: mode.icon, "aria-hidden": "true" }),
        el("span", { class: "ecyr-card-text" }, [
          el("span", { class: "ecyr-card-name", text: mode.name }),
          el("span", { class: "ecyr-card-line", text: line }),
          count,
        ]),
        el("span", { class: "ecyr-card-go", text: "Jugar", "aria-hidden": "true" }),
      ]);
      card.addEventListener("click", () => this.handlers.onStart(mode));
      return card;
    });

    const together = MODES.multiplayer;
    const classButton = el("button", { class: "ecyr-class", type: "button", "data-mode": together.id }, [
      el("span", { class: "ecyr-class-icon", text: together.icon, "aria-hidden": "true" }),
      el("span", { class: "ecyr-card-text" }, [
        el("span", { class: "ecyr-class-name", text: "Clase (multijugador)" }),
        el("span", {
          class: "ecyr-card-line",
          text: "Para el docente: un navegador abre la ciudad y los alumnos entran escaneando un código QR.",
        }),
      ]),
      el("span", { class: "ecyr-class-go", text: "›", "aria-hidden": "true" }),
    ]);
    classButton.addEventListener("click", () => this.handlers.onStart(together));

    // ECYR rebuild: Taxi Rush, the driving mode on the big city.
    const taxiButton = el("button", { class: "ecyr-taxi", type: "button", "data-mode": "taxi" }, [
      el("span", { class: "ecyr-taxi-icon", text: "🚕", "aria-hidden": "true" }),
      el("span", { class: "ecyr-card-text" }, [
        el("span", { class: "ecyr-taxi-name", text: "Taxi Rush" }),
        el("span", {
          class: "ecyr-card-line",
          text: "¡Nuevo! Conduce un taxi por una ciudad 10 veces más grande: entiende a dónde quiere ir cada pasajero y responde en los semáforos ❓. Solo o en clase (QR).",
        }),
      ]),
      el("span", { class: "ecyr-taxi-go", text: "GO!", "aria-hidden": "true" }),
    ]);
    taxiButton.addEventListener("click", () => this.handlers.onTaxi?.());

    const character = el("button", { class: "ecyr-link", type: "button", text: "🧍 Tu personaje" });
    character.addEventListener("click", () => this.handlers.onCharacter());
    this.qualityButton = el("button", { class: "ecyr-link", type: "button" }) as HTMLButtonElement;
    this.qualityButton.addEventListener("click", () => this.cycleQuality());

    this.root = el("div", { class: "menu-screen ecyr-chooser" }, [
      el("div", { class: "menu-panel ecyr-panel" }, [
        el("header", { class: "menu-head" }, [
          el("h1", { class: "menu-title", text: "Da World" }),
          el("p", {
            class: "menu-sub",
            text: "Una ciudad en 3D para recorrer a pie: los ciudadanos con ❓ necesitan tu inglés. ¿Qué quieres practicar?",
          }),
        ]),
        el("div", { class: "ecyr-cards" }, cards),
        taxiButton,
        classButton,
        el("div", { class: "ecyr-links" }, [character, this.qualityButton]),
      ]),
    ]);

    parent.append(this.root);
    this.refresh();
  }

  get isOpen(): boolean {
    return !this.root.classList.contains("is-gone");
  }

  hide(): void {
    this.root.classList.add("is-gone");
  }

  show(): void {
    this.root.classList.remove("is-gone");
    this.refresh();
  }

  /** Kept for the class code that pushes the race number here; the chooser has no race. */
  setRaceTarget(_target: number): void {}

  private cycleQuality(): void {
    const names = Object.keys(QUALITY) as QualityName[];
    this.quality = names[(names.indexOf(this.quality) + 1) % names.length];
    this.handlers.onQuality(this.quality);
    this.refresh();
  }

  private refresh(): void {
    this.qualityButton.textContent = "⚙️ Gráficos: " + QUALITY_ES[this.quality];
    for (const [id, node] of this.counts) {
      const missions = missionsFor(MODES[id]);
      const done = new Set(slotMissions(id) ?? []);
      const n = missions.filter((m) => done.has(m.id)).length;
      node.textContent =
        n >= missions.length
          ? "✓ " + missions.length + " misiones completadas"
          : n > 0
            ? n + " de " + missions.length + " misiones"
            : missions.length + " misiones";
      node.classList.toggle("is-done", n >= missions.length);
    }
  }
}
