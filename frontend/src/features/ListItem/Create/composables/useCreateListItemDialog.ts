import {modalController} from "@ionic/vue";
import type {listId} from "@/entities/list";
import CreateListItemDialog from "../ui/CreateListItemDialog.vue";

interface OpenDialogOptions {
    listId?: listId;
    presentingElement?: any;
    callback?: () => Promise<void>;
}

interface DialogInstance {
    present: () => Promise<void>;
    dismiss: (data?: any, role?: string) => Promise<boolean>;
    onDidDismiss: () => Promise<{data?: any; role?: string}>;
}

export const CreateListItemDialogService = {
    open: async (options: OpenDialogOptions = {}): Promise<DialogInstance> => {
        const modal = await modalController.create({
            component: CreateListItemDialog,
            componentProps: {
                listId: options.listId,
                callback: options.callback,
            },
            presentingElement: options.presentingElement,
        });

        return {
            present: () => modal.present(),
            dismiss: (data?: any, role?: string) => modal.dismiss(data, role),
            onDidDismiss: () => modal.onDidDismiss(),
        };
    },
};
