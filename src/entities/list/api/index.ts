import { API } from '@shared/instances/axios'
import type { List, ListForm, ListId } from '../model/types'

const LIST_ROUTE = 'lists'

const getAll = () =>
  new Promise<List[]>((resolve, reject) => {
    API.get(LIST_ROUTE)
      .then((response) => resolve(response.data))
      .catch((e) =>
        reject(
          Object.assign(new Error(e.message || 'Request error'), {
            response: e.response,
          })
        )
      )
  })

const getOne = (id: ListId) =>
  new Promise((resolve, reject) => {
    API.get(`${LIST_ROUTE}/${id}`)
      .then((response) => resolve(response.data))
      .catch((e) =>
        reject(
          Object.assign(new Error(e.message || 'Request error'), {
            response: e.response,
          })
        )
      )
  })

const create = (form: ListForm) =>
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

const update = (id: ListId, form: Pick<ListForm, 'title'>) =>
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

const deleteOne = (id: ListId) =>
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

export const apiList = {
  getAll,
  getOne,
  create,
  update,
  deleteOne,
} as const
