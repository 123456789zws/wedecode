#!/usr/bin/env node

import {Command} from "commander";
import packages from '../../../package.json';
import path from 'node:path';
import fs from 'node:fs';
import colors from 'picocolors'
import {DecompilationMicroApp} from "../../decompilation";
import {checkExistsWithFilePath, clearScreen, getPathInfo, printLog, sleep} from "../../common";
import prompts from "../../inquirer";


/**
 * @param {String} inputPath   wxapkg包路径
 * @param {String} outputPath  输出目录
 * */
async function singlePackMode(inputPath: string, outputPath: string) {
  if (path.extname(inputPath) !== '.wxapkg') {
    console.log(colors.red('\u274C  不是一个包'), inputPath)
    return
  }
  const decompilationMicroApp = new DecompilationMicroApp(inputPath, outputPath)
  await decompilationMicroApp.decompileAll()
}

const program = new Command();

program
  .name('wedecode')
  .usage("<command> [options]")
  .description('\u25B6 wxapkg 解包工具')
  .version(packages.version)
  .option("-o, --out <out-path>", '指定编译输出地目录， 正常是主包目录')
  .option("--overwrite <overwrite>", '直接覆盖旧的产物')
  .action(async (argMap: Record<any, any>, options: Record<any, any>) => {
    await sleep(200)
    const args = options.args || []
    const hasArgs = !(args.length === 0 && Object.keys(argMap).length === 0)
    const config = {
      inputPath: args[0],
      outputPath: argMap.out
    }
    clearScreen()
    printLog(colors.bgRed(colors.yellow(`\n\t🔶  \t  ${colors.bold('wxapkg 反编译工具 | wedecode')}\t\t🔶\t\n`)), {
      isStart: true,
      space1: '\n',
      space2: '\n',
      nativeOnly: true,
    })

    if (!hasArgs) Object.assign(config, await prompts.default())   // 接收输入的配置
    if (!checkExistsWithFilePath(config.inputPath, {throw: true})) return
    // 经过下面转换， 文件输出位置最终都会在改小程序包同级目录下的 __OUTPUT__ 文件夹中输出
    const isDirectory = fs.statSync(config.inputPath).isDirectory()
    if (fs.existsSync(config.outputPath)) {
      const isClearCache = argMap.overwrite ? '覆盖' : (await prompts.isClearOldCache(config.outputPath))['isClearCache']
      if (isClearCache === '覆盖' || argMap.overwrite) {
        fs.rmSync(config.outputPath, {recursive: true})
        printLog(`\n \u25B6 移除旧产物成功 `)
      }
    }
    printLog(` \u25B6 当前操作类型: ${colors.yellow(isDirectory ? '分包模式' : '单包模式')}`, {isEnd: true})

    if (isDirectory) {
      const wxapkgPathList = fs.readdirSync(config.inputPath).filter(str => {
        return path.extname(str) === '.wxapkg' && fs.statSync(path.resolve(config.inputPath, str)).isFile()
      })
      if (!wxapkgPathList.length) {
        console.log(colors.red('\u274C  文件夹下不存在 .wxapkg 包'), config.inputPath)
      }
      for (const packPath of wxapkgPathList) {   // 目录( 多包 )
        await singlePackMode(path.resolve(config.inputPath, packPath), config.outputPath)
      }
    } else {  // 文件 ( 单包 )
      await singlePackMode(config.inputPath, config.outputPath)
    }
  })

program.parse();
