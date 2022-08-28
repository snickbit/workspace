import {NodePlopAPI} from 'plop'
import * as NodePlop from 'node-plop'

export type Workspace = 'clis' | 'libraries'

export interface PlopAnswers {
	name: string
	workspace: Workspace
	destination: string
	typedoc: boolean
	git: boolean
	directory: string
}

export type Plop = NodePlopAPI

export type AddManyActionConfig = NodePlop.AddManyActionConfig
