/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css, PropertyValues, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import {
  HomeAssistant,
  hasConfigOrEntityChanged,
  hasAction,
  ActionHandlerEvent,
  handleAction,
  LovelaceCardEditor,
  getLovelace,
} from 'custom-card-helpers';
import { repeat } from 'lit/directives/repeat.js';
import type { ProjectCardConfig, ThingiverseResponse } from './types';
import { actionHandler } from './action-handler-directive';
import { CARD_VERSION } from './const';
import { localize } from './localize/localize';

/* eslint no-console: 0 */
console.info(
  `%c  PROJECT-CARD \n%c  ${localize('common.version')} ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'project-card',
  name: 'Project Card',
  description: 'A template custom card for you to create something awesome',
});

@customElement('project-card')
export class ProjectCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editor');
    return document.createElement('project-card-editor');
  }

  public static getStubConfig(): Record<string, unknown> {
    return {};
  }

  updateDisplayCards(values: string | any[]): void {
    if (values && values.length > 0) {
      this.displayedCards.shift();
      this.displayedCards.push(values[this.currentIndex]);
      this.currentIndex = (this.currentIndex + 1) % values.length;
      this.requestUpdate();
    }
    setTimeout(() => this.updateDisplayCards(values), this.config.timer_interval);
  }

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  private apiResponse: Array<ThingiverseResponse> = [];

  @property({ attribute: false })
  private displayedCards: Array<ThingiverseResponse> = [];

  @property({ attribute: false })
  private currentIndex = 1;

  @state() private config!: ProjectCardConfig;

  public setConfig(config: ProjectCardConfig): void {
    if (!config) {
      throw new Error(localize('common.invalid_configuration'));
    }

    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }

    this.config = {
      name: 'Project',
      ...config,
      timer_interval: config.timer_interval || 10000,
    };
  }

  async fetchThings(): Promise<void> {
    const response = await fetch(this.config.api_url);

    this.apiResponse = await response.json();

    for (
      this.currentIndex = 0;
      this.currentIndex < 3 && this.currentIndex < this.apiResponse.length;
      this.currentIndex++
    ) {
      this.displayedCards.push(this.apiResponse[this.currentIndex]);
    }

    setTimeout(() => this.updateDisplayCards(this.apiResponse), this.config.timer_interval);
  }

  protected firstUpdated(): void {
    this.fetchThings();
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    }

    return hasConfigOrEntityChanged(this, changedProps, true);
  }

  protected render(): TemplateResult | void {
    return html`
      ${repeat(
        this.displayedCards,
        (displayedCard) => displayedCard.id,
        (entry) =>
          html`<ha-card
            @action=${this._handleAction}
            .actionHandler=${actionHandler({
              hasHold: hasAction(this.config.hold_action),
              hasDoubleClick: hasAction(this.config.double_tap_action),
            })}
            .label=${entry?.name}
            tabindex="0"
          >
            <img src=${entry?.thumbnail} style="width: 100%; height: 100%" />
            <h4>${entry?.name}</h4>
            <h5>${entry?.creator?.name}</h5>
          </ha-card>`,
      )}
    `;
  }

  private _handleAction(ev: ActionHandlerEvent): void {
    if (this.hass && this.config && ev.detail.action) {
      handleAction(this, this.hass, this.config, ev.detail.action);
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        padding: 1rem;
        margin-bottom: 0.75rem;
      }
    `;
  }
}
