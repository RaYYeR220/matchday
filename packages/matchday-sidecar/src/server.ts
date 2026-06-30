import 'dotenv/config'
import { buildFromEnv } from './config'
import { createServer } from './http'

const port = Number(process.env.PORT ?? 8787)
const server = createServer(buildFromEnv())

server.listen(port, () => {
  console.log(`matchday sidecar listening on http://127.0.0.1:${port}`)
})
