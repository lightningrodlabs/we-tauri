import { Assessment } from "./assessment";

/**
 * An unsubscribe function returned from a subscribe call
 */
export type UnsubscribeFn = () => void;

/**
 * A callback function to be called when updates occur
 */
export type CallbackFn = (_: Assessment | undefined) => void;

/**
 * Generic constructor type
 */
export type Constructor<T = Object> = new (...args: any[]) => T;

/**
 * Simple interface for allowing a a delegate to be set
 */
export interface NHDelegateReceiver<D> {
  set nhDelegate(delegate: D)
}

/**
 * An instance of an HTMLElement that implements the NHDelegateReceiver<D> interface
 */
export type NHDelegateReceiverComponent<D> = (HTMLElement & NHDelegateReceiver<D>)

/**
 * An object constructor that creates a NHDelegateReceiverComponent<D>
 */
export type NHDelegateReceiverConstructor<D> = Constructor<NHDelegateReceiverComponent<D>>
