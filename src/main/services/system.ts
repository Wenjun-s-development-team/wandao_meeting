import { Service } from './service'

export class SystemService extends Service {
  constructor() {
    super()
    console.log('SystemService constructor')
  }

  start() {}
}

export const useSystemService = new SystemService()
