import { Recorder } from "./recorder.mjs";
class PollingRecorder {
  _recorder;
  _embedder;
  _pollRecorderModeTimer;
  _lastStateJSON;
  constructor(injectedScript, options) {
    this._recorder = new Recorder(injectedScript, options);
    this._embedder = injectedScript.window;
    injectedScript.onGlobalListenersRemoved.add(() => this._recorder.installListeners());
    const refreshOverlay = () => {
      this._lastStateJSON = void 0;
      this._pollRecorderMode().catch((e) => console.log(e));
    };
    this._embedder.__pw_refreshOverlay = refreshOverlay;
    refreshOverlay();
  }
  async _pollRecorderMode() {
    const pollPeriod = 1e3;
    if (this._pollRecorderModeTimer)
      this._recorder.injectedScript.utils.builtins.clearTimeout(this._pollRecorderModeTimer);
    const state = await this._embedder.__pw_recorderState().catch(() => null);
    if (!state) {
      this._pollRecorderModeTimer = this._recorder.injectedScript.utils.builtins.setTimeout(() => this._pollRecorderMode(), pollPeriod);
      return;
    }
    const stringifiedState = JSON.stringify(state);
    if (this._lastStateJSON !== stringifiedState) {
      this._lastStateJSON = stringifiedState;
      const win = this._recorder.document.defaultView;
      if (win.top !== win) {
        state.actionPoint = void 0;
      }
      this._recorder.setUIState(state, this);
    }
    this._pollRecorderModeTimer = this._recorder.injectedScript.utils.builtins.setTimeout(() => this._pollRecorderMode(), pollPeriod);
  }
  async performAction(action) {
    await this._embedder.__pw_recorderPerformAction(action);
  }
  async recordAction(action, preconditionSelector) {
    await this._embedder.__pw_recorderRecordAction(action, preconditionSelector);
  }
  async elementPicked(elementInfo) {
    await this._embedder.__pw_recorderElementPicked(elementInfo);
  }
  async setMode(mode) {
    await this._embedder.__pw_recorderSetMode(mode);
  }
  async setOverlayState(state) {
    await this._embedder.__pw_recorderSetOverlayState(state);
  }
}
var pollingRecorder_default = PollingRecorder;
export {
  PollingRecorder,
  pollingRecorder_default as default
};

//# sourceMappingURL=pollingRecorder.mjs.map
