import { AxiosInstance } from 'axios'
import { fetchAllPages, WorkflowKind } from './flows'

// Maps the client's "greymatter Monitor Objects" Object Type picklist to the
// kinds Vantage already understands. Mailbox/Audit History/Databridge/Fuse rows
// exist in the table but are out of scope for flow monitoring.
const OBJECT_TYPE_MAP: Record<number, WorkflowKind> = {
  914310000: 'workflow',
  914310001: 'cloud_flow',
}

export interface MonitorConfiguration {
  id: string
  name: string
  environmentTitle: string | null
  lastValidation: string | null
  validationInterval: number | null
}

export interface MonitorObject {
  id: string
  name: string
  objectType: WorkflowKind
  intendedStatus: boolean
  currentStatus: boolean
  isFound: boolean
  passValidation: boolean
  alertRequired: boolean
  alertSent: boolean
  lastValidationCheck: string | null
  modifiedOn: string | null
  configurationId: string | null
}

function isNotFoundError(err: any): boolean {
  return err?.response?.status === 404
}

export async function getMonitorConfigurations(client: AxiosInstance): Promise<MonitorConfiguration[] | null> {
  try {
    const resp = await client.get(
      `/foundry_greymattermonitorconfigurations?$select=foundry_greymattermonitorconfigurationid,foundry_name,foundry_environmenttitle,foundry_lastvalidation,foundry_validationinterval&$orderby=foundry_name asc`
    )
    return (resp.data.value ?? []).map((c: any) => ({
      id: c.foundry_greymattermonitorconfigurationid,
      name: c.foundry_name,
      environmentTitle: c.foundry_environmenttitle ?? null,
      lastValidation: c.foundry_lastvalidation ?? null,
      validationInterval: c.foundry_validationinterval ?? null,
    }))
  } catch (err) {
    if (isNotFoundError(err)) return null
    throw err
  }
}

export async function getMonitorObjects(client: AxiosInstance, configurationId?: string): Promise<MonitorObject[] | null> {
  const typeFilter = `(foundry_objecttype eq 914310000 or foundry_objecttype eq 914310001)`
  const configFilter = configurationId ? ` and _foundry_greymattermonitorconfigur_value eq ${configurationId}` : ''
  try {
    const rows = await fetchAllPages(
      client,
      `/foundry_greymattermonitorobjectses?$filter=${typeFilter}${configFilter}` +
        `&$select=foundry_greymattermonitorobjectsid,foundry_name,foundry_objecttype,foundry_intendedstatus,` +
        `foundry_isenabled,foundry_isfound,foundry_passthevalidation,foundry_alertrequired,foundry_alertsent,` +
        `foundry_lastvalidationcheck,foundry_componentlastmodifieddate,_foundry_greymattermonitorconfigur_value` +
        `&$orderby=foundry_name asc`
    )
    return rows
      .filter((r: any) => OBJECT_TYPE_MAP[r.foundry_objecttype])
      .map((r: any) => ({
        id: r.foundry_greymattermonitorobjectsid,
        name: r.foundry_name,
        objectType: OBJECT_TYPE_MAP[r.foundry_objecttype],
        intendedStatus: Boolean(r.foundry_intendedstatus),
        currentStatus: Boolean(r.foundry_isenabled),
        isFound: Boolean(r.foundry_isfound),
        passValidation: Boolean(r.foundry_passthevalidation),
        alertRequired: Boolean(r.foundry_alertrequired),
        alertSent: Boolean(r.foundry_alertsent),
        lastValidationCheck: r.foundry_lastvalidationcheck ?? null,
        modifiedOn: r.foundry_componentlastmodifieddate ?? null,
        configurationId: r['_foundry_greymattermonitorconfigur_value'] ?? null,
      }))
  } catch (err) {
    if (isNotFoundError(err)) return null
    throw err
  }
}
