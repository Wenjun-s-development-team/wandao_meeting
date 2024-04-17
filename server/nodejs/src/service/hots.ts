export class Host {
  authorizedIPs: Map<any, any>
  constructor() {
    this.authorizedIPs = new Map()
  }

  /**
   * Get authorized IPs
   * @returns object
   */
  getAuthorizedIPs() {
    return Object.fromEntries(this.authorizedIPs)
  }

  /**
   * Set authorized IP
   * @param {string} ip
   * @param {boolean} authorized
   */
  setAuthorizedIP(ip: string, authorized: boolean) {
    this.authorizedIPs.set(ip, authorized)
  }

  /**
   * Check if IP is authorized
   * @param {string} ip
   * @returns boolean
   */
  isAuthorizedIP(ip: string) {
    return this.authorizedIPs.has(ip)
  }

  /**
   * Delete ip from authorized IPs
   * @param {string} ip
   * @returns boolean
   */
  deleteIP(ip: string) {
    return this.authorizedIPs.delete(ip)
  }
};
