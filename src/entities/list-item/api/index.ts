import { API } from '@shared/instances/axios'
import type { ListItemId, ListItem, ListItemForm } from '../model/types'

const LIST_ROUTE = 'list-items'

const create = (form: ListItemForm) =>
  new Promise((resolve, reject) => {
    API.post(LIST_ROUTE, { ...form })
      .then((response) => resolve(response.data))
      .catch((e) =>
        reject(
          Object.assign(new Error(e.message || 'Request error'), {
            response: e.response,
          })
        )
      )
  })

const toggle = (id: ListItemId, form: Pick<ListItem, 'checked'>) =>
  new Promise((resolve, reject) => {
    API.patch(`${LIST_ROUTE}/${id}`, { ...form })
      .then((response) => resolve(response.data))
      .catch((e) =>
        reject(
          Object.assign(new Error(e.message || 'Request error'), {
            response: e.response,
          })
        )
      )
  })

const deleteOne = (id: ListItemId) =>
  new Promise((resolve, reject) => {
    API.delete(`${LIST_ROUTE}/${id}`)
      .then((response) => resolve(response.data))
      .catch((e) =>
        reject(
          Object.assign(new Error(e.message || 'Request error'), {
            response: e.response,
          })
        )
      )
  })

export const apiListItem = {
  create,
  toggle,
  deleteOne,
} as const
