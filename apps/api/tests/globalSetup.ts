import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { execSync } from 'child_process'

export default async function globalSetup() {
  dotenv.config({ path: resolve(__dirname, '../.env.test') })
  process.env.DATABASE_URL = process.env.DATABASE_URL

  // Reset DB once before ALL test suites
  execSync('npx prisma migrate reset --force', {
    env: { ...process.env },
    stdio: 'pipe',
    cwd: resolve(__dirname, '..')
  })
}