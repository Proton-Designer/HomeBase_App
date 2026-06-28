import { invokeFn } from './functions';

export async function connect(): Promise<{ authorizeUrl: string }> {
  return invokeFn<{ authorizeUrl: string }>('calendar-connect', {});
}
