# Sigmoji (fork of gitmoji)
> A [gitmoji](https://github.com/carloscuesta/gitmoji) interactive client for using gitmojis on commit messages.
## About
Only for use internally within SigFig


```bash
$ npm i -g sigmoji-cli
```

## Usage

```bash
$ gitmoji --init (to add hook in ngts/bam)
$ git commit 
```

Titles are always required and when you make a PR the latest commit will become the PR title.
You can press enter and skip body & JIRA tags


```bash
$ gitmoji --help
```

```
A gitmoji interactive client for using gitmojis on commit messages.

  Usage
    $ gitmoji
  Options
    --init, -i      Initialize gitmoji as a commit hook
    --remove, -r    Remove a previously initialized commit hook
    --config, -g    Setup gitmoji-cli preferences.
    --commit, -c    Interactively commit using the prompts
    --list, -l      List all the available gitmojis
    --search, -s    Search gitmojis
    --version, -v   Print gitmoji-cli installed version
    --update, -u    Sync emoji list with the repo
```
#### Hook 
Run the init option, add your changes and commit them, after that the prompts will begin and your commit message will be built.

```bash
$ gitmoji -i # this will create the .git/hook/prepare-commit-msg
$ git add .
$ git commit
```

### Commit

You can use the commit functionality in two ways, directly or via a commit-hook.

#### Client

Start the interactive commit client, to auto generate your commit based on your prompts.

```bash
$ gitmoji -c
```


![gitmoji commit](https://cloud.githubusercontent.com/assets/7629661/20454513/5db2750a-ae43-11e6-99d7-4757108fe640.png)

### Search

Search using specific keywords to find the right gitmoji.

```bash
$ gitmoji bug linter -s
```

![gitmoji list](https://cloud.githubusercontent.com/assets/7629661/20454469/1815550e-ae42-11e6-8c23-33ab7a3e48a3.png)


### List

Pretty print all the available gitmojis.

```bash
$ gitmoji -l
```

![gitmoji list](https://cloud.githubusercontent.com/assets/7629661/20454472/1c351e6c-ae42-11e6-8f3c-da73429d8eff.png)

### Update

Update the gitmojis list, by default the first time you run gitmoji, the cli creates a cache to allow using this tool without internet connection.

```bash
$ gitmoji -u
```

### Config

Run `gitmoji -g` to setup some gitmoji-cli preferences, such as the auto `git add .` feature.

![gitmoji config](https://cloud.githubusercontent.com/assets/7629661/23577826/82e8745e-00c9-11e7-9d7e-623a0a51bff9.png)
