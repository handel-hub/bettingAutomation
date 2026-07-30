/**
 * @file index.mjs
 * @description Central export module for Synchronization subsystem, including
 * legacy synchronization components and SANRA vNext Stage 1 infrastructure.
 */

// --- SANRA vNext Stage 1 Infrastructure ---
export * from './models/SanraWireProtocol.mjs';
export * from './pool/SanraMemoryPool.mjs';
export * from './telemetry/SanraTelemetry.mjs';

// --- SANRA vNext Stage 2 Infrastructure ---
export * from './providers/viewport/index.mjs';
export { ViewportCapabilityProvider } from './providers/ViewportCapabilityProvider.mjs';

// --- SANRA vNext Stage 3 Infrastructure ---
export * from './transforms/index.mjs';
export * from './addressing/index.mjs';

// --- Legacy Synchronization & Seam Components ---
export { BrowserStateRegistry } from './BrowserStateRegistry.mjs';
export { CapabilityRegistry } from './CapabilityRegistry.mjs';
export { SynchronizationManager } from './SynchronizationManager.mjs';
export { SynchronizationBarrier } from './SynchronizationBarrier.mjs';
export { SynchronizationLevel } from './SynchronizationLevel.mjs';
export { SynchronizationEvents } from './SynchronizationEvents.mjs';
export { Capabilities } from './capabilities.mjs';
export { SynchronizationTelemetry } from './telemetry/SynchronizationTelemetry.mjs';
export { SynchronizationTimeline } from './telemetry/SynchronizationTimeline.mjs';

