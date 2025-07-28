import {BaseFormData} from "@shared/composables/useFormHandler";

export interface LoginForm extends BaseFormData{
    email: string;
    password: string;
}

export interface RegisterForm extends BaseFormData{
    name: string;
    email: string;
    password: string;
}
