#!/usr/bin/env node

import {execa} from 'execa'

/**
 * @param {Plop} plop
 */
export default function(plop) {
	plop.setHelper('year', () => {
		return new Date().getFullYear()
	})

	plop.setHelper('ifEquals', function(arg1, arg2, options) {
		return arg1 === arg2 ? options.fn(this) : options.inverse(this)
	})

	const dotfiles = [
		'.eslintignore',
		'.gitignore',
		'.eslintrc.json'
	]

	/** @type {AddManyActionConfig} */
	const add_many_action = {
		type: 'addMany',
		skipIfExists: true,
		destination: '{{workspace}}/{{name}}'
	}

	const projectActions = [
		{
			...add_many_action,
			templateFiles: '.templates/{{workspace}}/**/*',
			base: '.templates/{{workspace}}'
		},
		{
			...add_many_action,
			templateFiles: ['.templates/common/**/*', '!.templates/common/_*.hbs'],
			base: '.templates/common'
		}
	]

	for (const dotfile of dotfiles) {
		const _dotfile = dotfile.replace(/^\./, '_')
		projectActions.push({
			type: 'add',
			templateFile: `.templates/common/${_dotfile}.hbs`,
			path: `{{workspace}}/{{name}}/${dotfile}`
		})
	}

	// create your generators here
	plop.setGenerator('project', {
		description: 'Generate a new project',
		prompts: [
			{
				type: 'input',
				name: 'name',
				message: 'Package name: @snickbit/'
			},
			{
				type: 'rawlist',
				name: 'workspace',
				message: 'Package Workspace',
				choices: ['libraries', 'clis'],
				default: 'libraries'
			}
		],
		actions: [
			...projectActions,

			/**
			 * @param {PlopAnswers} answers
			 * @returns {Promise<string>}
			 */
			async function bootstrap(answers) {
				console.log('[bootstrap] Bootstrapping')

				const rootOptions = {
					stderr: 'inherit',
					cwd: process.cwd()
				}

				const options = {
					...rootOptions,
					cwd: `${answers.workspace}/${answers.name}`
				}

				const updateAndInstall = async () => {
					console.log('[updateAndInstall] Updating and installing packages')
					try {
						console.log('[updateAndInstall] Updating first party package versions in package.json')
						await execa('pnpm', [
							'npm-check-updates',
							'--upgrade',
							'--target=newest',
							'--filter=@snickbit/*'
						], options)

						console.log('[updateAndInstall] Installing dependencies')
						await execa('pnpm', ['install'], rootOptions)
					} catch (error) {
						console.error('[updateAndInstall]', error)
					} finally {
						console.log('[updateAndInstall] Done')
					}
				}

				const fixStyles = async () => {
					console.log('[fixStyles] Fixing styles')
					try {
						await execa('pnpm', [
							'eslint',
							'.',
							'--quiet',
							'--fix',
							'--ext',
							'.ts,.json'
						], options)
					} catch (error) {
						console.error('[fixStyles]', error)
					} finally {
						console.log('[fixStyles] Done')
					}
				}

				let git_initialized = false

				const gitInit = async () => {
					console.log(`(gitInit) Initializing git repo in ${options.cwd}`)
					try {
						await execa('git', ['init'], options)
						git_initialized = true
					} catch (error) {
						console.error('[gitInit]', error)
					} finally {
						console.log('[gitInit] Done')
					}
				}

				await Promise.all([updateAndInstall(), fixStyles(), gitInit()])

				if (git_initialized) {
					console.log('[gitCommit] Committing changes')
					await execa('git', ['add', '.'], options)
					await execa('git', ['commit', '-m', 'init: first commit'], options)
					console.log('[gitCommit] Done')
				}

				return 'Bootstrap Complete'
			}
		]
	})
}
