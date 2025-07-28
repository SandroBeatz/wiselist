import {reactive} from "vue";
import {InputCustomEvent} from "@ionic/vue";
import {apiAuth} from "../api";

export function useRegisterForm() {
    const form = reactive({
        name: '',
        email: '',
        password: '',
    })

    function handlerField(event: InputCustomEvent) {
        const target = event.target as HTMLIonInputElement
        const name = target.name as keyof typeof form
        const value = event.target.value ?? ''

        if(!name) return

        form[name] = String(value)
    }

    async function handleSubmit() {
        try {
            await apiAuth.register(form)
        } catch (e) {
            console.log(e)
        }
    }

    return {
        form,
        handlerField,
        handleSubmit
    }
}
