import { SlCheckbox, SlInput, SlRadioGroup } from '@shoelace-style/shoelace';
import { state } from 'lit/decorators.js';
import { ValidationError, ObjectSchema } from 'yup';
import { NHComponentShoelace } from './base';

export abstract class NHBaseForm extends NHComponentShoelace {
  @state() protected errors: Record<string, string> = {};
  @state() protected touched: Record<string, boolean> = {};
  @state() protected _model: object = {};

  // Abstract method to define schema in derived classes
  protected abstract get validationSchema(): ObjectSchema<any>;

  protected handleInputChange(e: Event) {
    const target = e.target as SlInput | SlCheckbox | SlRadioGroup | HTMLInputElement;
    const name = target.name || target.dataset.name; // Fallback to dataset for name
    const value = (target as HTMLInputElement | HTMLSelectElement).value;

    this.touched[name as string] = true;
    //@ts-ignore
    this._model[name as keyof this] = value;
    this.validateField(name as string, value);
  }


  protected async validateField(name: string, value: any) {
    try {
      await this.validationSchema.validateAt(name, {[name]: value});
      this.errors = { ...this.errors, [name]: '' }; // Clear error for the field
    } catch (error) {
      if (error instanceof ValidationError) {
        this.errors = { ...this.errors, [name]: error.message };
      }
    }
  }

  protected async validateForm() {
    try {
      await this.validationSchema.validate(this, { abortEarly: false });
      this.errors = {}; // Clear all errors
      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        const newErrors = error.inner.reduce((acc, curr) => {
          acc[curr.path as string] = curr.message;
          return acc;
        }, {} as Record<string, string>);
        this.errors = newErrors;
        // Mark all fields as touched
        error.inner.forEach(err => this.touched[err.path as string] = true);
      }
      return false;
    }
  }

  protected isFormUntouched() {
    return Object.values(this.touched).every(touched => !touched);
  }
  protected getErrorMessage(inputName: string): string | undefined {
    return this.touched[inputName] && this.errors[inputName] ? this.errors[inputName] : undefined;
  }
}
