import {useFormHandler} from "@shared/composables/useFormHandler";
import {apiList, type ListForm} from "@/entities/list";

export const useCreateEditListForm = () => {
    return useFormHandler<ListForm>({
        initialData: {
            title: '',
            type: 'SHOPPING'
        },
        onSubmit: async (formData) => {
            try {
                await apiList.create(formData)
            } catch (e) {
                console.log(e)
            }
        }
    })
}
