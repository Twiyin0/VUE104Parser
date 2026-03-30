import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import archiver from 'archiver'
import { Client } from 'ssh2'
import 'dotenv/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const config = {
  localDir:        path.resolve(__dirname, '..'),
  archiveFileName: 'project.tar.gz',
  remoteDir:       '/opt/node/104Parser',
  host:            process.env.SSH_HOST     ?? 'host',
  port:            parseInt(process.env.SSH_PORT ?? '22', 10),
  username:        process.env.SSH_USER     ?? 'name',
  password:        process.env.SSH_PASSWORD ?? 'password',
  excludes: ['node_modules/**', '.git/**', '*.tar.gz', '.env*', 'upload/**'],
}

function createArchive(): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.resolve(__dirname, config.archiveFileName)
    console.log(`\n[1/3] 正在压缩目录: ${config.localDir}`)
    console.log(`      排除: ${config.excludes.join(', ')}`)
    const output  = fs.createWriteStream(outputPath)
    const archive = archiver('tar', { gzip: true, gzipOptions: { level: 6 } })
    output.on('close', () => {
      console.log(`      压缩完成，大小: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`)
      resolve(outputPath)
    })
    archive.on('error', reject)
    archive.pipe(output)
    archive.glob('**/*', { cwd: config.localDir, ignore: config.excludes, dot: true })
    archive.finalize()
  })
}

async function uploadAndExtract(archivePath: string): Promise<void> {
  const remoteArchivePath = `${config.remoteDir}/${config.archiveFileName}`
  console.log(`\n[2/3] 正在连接 → ${config.username}@${config.host}:${config.port}`)

  const conn = new Client()
  await new Promise<void>((resolve, reject) => {
    conn.on('ready', resolve).on('error', reject)
    conn.connect({ host: config.host, port: config.port, username: config.username, password: config.password })
  })
  console.log('      连接成功')

  try {
    const sftp = await new Promise<any>((resolve, reject) => {
      conn.sftp((err, s) => err ? reject(err) : resolve(s))
    })

    console.log(`      正在上传 → ${remoteArchivePath}`)
    const totalBytes = fs.statSync(archivePath).size

    await new Promise<void>((resolve, reject) => {
      sftp.fastPut(archivePath, remoteArchivePath, {
        step: (transferred: number, _: number, total: number) => {
          process.stdout.write(`\r      上传进度: ${((transferred/total)*100).toFixed(1)}%  (${(transferred/1024/1024).toFixed(2)}/${(totalBytes/1024/1024).toFixed(2)} MB)`)
        }
      }, (err: Error) => { process.stdout.write('\n'); err ? reject(new Error(`上传失败: ${err.message}`)) : resolve() })
    })
    console.log('      上传完成')

    console.log(`\n[3/3] 正在解压到 ${config.remoteDir} ...`)
    await new Promise<void>((resolve, reject) => {
      const cmd = `tar -xzf "${remoteArchivePath}" -C "${config.remoteDir}" && rm -f "${remoteArchivePath}"; echo __DONE__`
      conn.exec(cmd, (err, stream) => {
        if (err) return reject(err)
        let out = ''
        stream.stdout.on('data', (d: Buffer) => { out += d; if (out.includes('__DONE__')) resolve() })
        stream.stderr.on('data', (d: Buffer) => { out += d })
        stream.on('close', (code: number) => {
          if (code === 0 || out.includes('__DONE__')) resolve()
          else reject(new Error(`解压失败 (code ${code}): ${out}`))
        })
      })
    })
    console.log('      解压完成，远端压缩包已清理')
  } finally {
    conn.end()
  }
}

async function main() {
  let archivePath = ''
  try {
    console.log('====== 开始部署 ======')
    archivePath = await createArchive()
    await uploadAndExtract(archivePath)
    console.log('\n====== 部署成功 ✓ ======')
  } catch (err: any) {
    console.error('\n✗ 部署失败:', err.message)
    process.exit(1)
  } finally {
    if (archivePath && fs.existsSync(archivePath)) {
      fs.unlinkSync(archivePath)
      console.log('本地临时文件已清理')
    }
  }
}

main()
