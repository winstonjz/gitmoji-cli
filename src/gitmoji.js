const chalk = require('chalk')
const execa = require('execa')
const fs = require('fs')
const inquirer = require('inquirer')
const parentDirs = require('parent-dirs')
const path = require('path')
const pathExists = require('path-exists')
const branchName = require('branch-name')

const config = require('./config')
const prompts = require('./prompts')
const constants = require('./constants')

inquirer.registerPrompt(
  'autocomplete', require('inquirer-autocomplete-prompt')
)

class GitmojiCli {
  constructor (gitmojiApiClient, gitmojis) {
    this._gitmojiApiClient = gitmojiApiClient
    this._gitmojis = gitmojis
    if (config.getAutoAdd() === undefined) config.setAutoAdd(true)
    if (!config.getIssueFormat()) config.setIssueFormat(constants.BRACKET)
    if (!config.getEmojiFormat()) config.setEmojiFormat(constants.EMOJI_FORMAT)
    if (config.getSignedCommit() === undefined) config.setSignedCommit(true)
  }

  config () {
    inquirer.prompt(prompts.config).then(answers => {
      config.setAutoAdd(answers[constants.AUTO_ADD])
      config.setIssueFormat(answers[constants.ISSUE_FORMAT])
      config.setEmojiFormat(answers[constants.EMOJI_FORMAT])
      config.setSignedCommit(answers[constants.SIGNED_COMMIT])
    })
  }

  init () {
    if (!this._isAGitRepo()) {
      return this._errorMessage('Not a git repository - @init')
    }

    execa('git', ['rev-parse', '--absolute-git-dir'])
      .then(result => {
        fs.writeFile(
          result.stdout.trim() + constants.HOOK_PATH,
          constants.HOOK_FILE_CONTENTS,
          { mode: constants.HOOK_PERMISSIONS },
          (err) => {
            if (err) this._errorMessage(err)
            console.log(
              `${chalk.yellow('gitmoji')} commit hook created successfully.`
            )
          }
        )
      })
      .catch(err => {
        return this._errorMessage(err)
      })
  }

  remove () {
    if (!this._isAGitRepo()) {
      return this._errorMessage('Couldn\'t remove hook, not a git repository')
    }

    execa('git', ['rev-parse', '--absolute-git-dir'])
      .then(result => {
        fs.unlink(result.stdout.trim() + constants.HOOK_PATH, (err) => {
          if (err) return this._errorMessage(err)
          return console.log(
              `${chalk.yellow('gitmoji')} commit hook unlinked successfully.`
            )
        })
      })
      .catch(err => {
        return this._errorMessage(err)
      })
  }

  list () {
    return this._fetchEmojis()
      .then(gitmojis => this._parseGitmojis(gitmojis))
      .catch(err => this._errorMessage(`gitmoji list not found - ${err.code}`))
  }

  search (query) {
    return this._fetchEmojis()
      .then((gitmojis) => gitmojis.filter((gitmoji) => {
        const emoji = gitmoji.name.concat(gitmoji.description).toLowerCase()
        return (emoji.indexOf(query.toLowerCase()) !== -1)
      }))
      .then((gitmojisFiltered) => this._parseGitmojis(gitmojisFiltered))
      .catch((err) => this._errorMessage(err.code))
  }

  ask (mode) {
    if (!this._isAGitRepo()) {
      return this._errorMessage('This directory is not a git repository.')
    }

    return this._fetchEmojis()
      .then((gitmojis) => prompts.gitmoji(gitmojis)
      )
      .then((questions) => {
        Promise.all([inquirer.prompt(questions), branchName.get()]).then(([answers, currentBranchName]) => {
          const jiraMatcher = /((?!([A-Z0-9a-z]{1,10})-?$)[A-Z]{1}[A-Z0-9]+-\d+)/g
          const jiraTags = currentBranchName.match(jiraMatcher)
          answers.jiraTags = jiraTags || []
          if (mode === constants.HOOK_MODE) return this._hook(answers)
          return this._commit(answers)
        })
      })
      .catch(err => this._errorMessage(err.code))
  }

  updateCache () {
    this._fetchRemoteEmojis()
      .then(emojis => this._createCache(this._getCachePath(), emojis))
  }

  _errorMessage (message) {
    console.error(chalk.red(`ERROR: ${message}`))
  }

  _hook (answers) {
    const references = answers.jiraTags.map(tag => `${this._formatTag(tag)}`).join('')
    const title = `${references} (${answers.gitmoji}) - ${answers.title}`
    const body = `${answers.message}`

    fs.writeFile(process.argv[3], `${title}\n\n${body}`, (error) => {
      if (error) {
        return this._errorMessage(error)
      }

      process.exit(0)
    })
  }

  _formatTag (reference) {
    if (config.getIssueFormat === constants.GITHUB) {
      return `#${reference}`
    } else if (config.getIssueFormat === constants.BRACKET) {
      return `[${reference}]`
    } else {
      return `${reference}`
    }
  }

  _commit (answers) {
    const references = answers.jiraTags.map(tag => `${this._formatTag(tag)}`).join('')
    const title = `${references} (${answers.gitmoji}) - ${answers.title}`
    const body = `${answers.message}`
    const signed = config.getSignedCommit() ? '-S' : ''
    const commit = `git commit ${signed} -m "${title}" -m "${body}"`

    if (!this._isAGitRepo()) {
      return this._errorMessage('Not a git repository')
    }

    if (config.getAutoAdd()) {
      execa.stdout('git', ['add', '.'])
        .then((res) => console.log(chalk.blue(res)))
        .catch((err) => this._errorMessage(err.stderr))
    }
    execa.shell(commit)
      .then((res) => console.log(chalk.blue(res.stdout)))
      .catch((err) => this._errorMessage(err.stderr ? err.stderr : err.stdout))

    return commit
  }

  _parseGitmojis (gitmojis) {
    return gitmojis.map(gitmoji => {
      const emoji = gitmoji.emoji
      const code = gitmoji.code
      const description = gitmoji.description
      return console.log(`${emoji} - ${chalk.blue(code)} - ${description}`)
    })
  }

  _isAGitRepo () {
    return parentDirs(process.cwd())
      .some((directory) => pathExists.sync(path.resolve(directory, '.git')))
  }

  _getCachePath () {
    const home = process.env.HOME || process.env.USERPROFILE
    return path.join(home, '.gitmoji', 'gitmojis.json')
  }

  _cacheAvailable (cachePath) {
    return pathExists.sync(cachePath)
  }

  _createCache (cachePath, emojis) {
    const cacheDir = path.dirname(cachePath)

    if (emojis !== undefined) {
      if (!pathExists.sync(cacheDir)) {
        fs.mkdirSync(cacheDir)
      }
      fs.writeFileSync(cachePath, JSON.stringify(emojis))
    }
  }

  _fetchRemoteEmojis () {
    return this._gitmojiApiClient.request({
      method: 'GET',
      url: '/src/data/gitmojis.json'
    }).then((res) => {
      console.log(`${chalk.yellow('Gitmojis')} updated successfully!`)
      return res.data.gitmojis
    })
    .catch((error) =>
      this._errorMessage(`Network connection not found - ${error.code}`)
    )
  }

  _fetchCachedEmojis (cachePath) {
    return Promise.resolve(JSON.parse(fs.readFileSync(cachePath)))
  }

  _fetchEmojis () {
    const cachePath = this._getCachePath()
    if (this._cacheAvailable(cachePath)) {
      return this._fetchCachedEmojis(cachePath)
    }
    return this._fetchRemoteEmojis().then((emojis) => {
      this._createCache(cachePath, emojis)
      return emojis
    })
  }
}

module.exports = GitmojiCli
