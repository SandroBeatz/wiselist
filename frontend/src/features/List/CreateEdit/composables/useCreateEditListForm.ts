import {useFormHandler} from "@shared/composables/useFormHandler";
import {apiList, type ListForm, type listId} from "@/entities/list";

const validateListForm = (formData: ListForm): Record<keyof ListForm, string> | null => {
    const errors: Partial<Record<keyof ListForm, string>> = {};

    // Validate title
    if (!formData.title || formData.title.trim().length === 0) {
        errors.title = 'Title is required';
    } else if (formData.title.trim().length < 2) {
        errors.title = 'Title must be at least 2 characters long';
    } else if (formData.title.trim().length > 100) {
        errors.title = 'Title must not exceed 100 characters';
    }

    // Validate type
    if (!formData.type) {
        errors.type = 'Type is required';
    } else if (!['SHOPPING', 'TODO', 'OTHER'].includes(formData.type)) {
        errors.type = 'Invalid list type';
    }

    return Object.keys(errors).length > 0 ? errors as Record<keyof ListForm, string> : null;
};

interface UseCreateEditListFormOptions {
    listId?: listId;
    initialData?: Partial<ListForm>;
}

export const useCreateEditListForm = (options: UseCreateEditListFormOptions = {}) => {
    const { listId, initialData } = options;
    const isEditMode = !!listId;

    return useFormHandler<ListForm>({
        initialData: {
            title: initialData?.title || '',
            type: initialData?.type || 'SHOPPING'
        },
        validate: validateListForm,
        onSubmit: async (formData) => {
            try {
                if (isEditMode && listId) {
                    await apiList.update(listId, { title: formData.title });
                } else {
                    await apiList.create(formData);
                }
            } catch (e) {
                console.log(e);
                throw e;
            }
        }
    });
};
