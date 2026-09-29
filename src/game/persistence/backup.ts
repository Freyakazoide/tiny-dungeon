import type { GameState } from '../core/types';
import { cloneValidatedState } from './validation';

interface BackupEnvelope { format:'tiny-dungeon-save'; version:1; exportedAt:string; state:GameState; }
export function exportBackup(state:GameState){const payload:BackupEnvelope={format:'tiny-dungeon-save',version:1,exportedAt:new Date().toISOString(),state:cloneValidatedState(state)};return JSON.stringify(payload,null,2);}
export function importBackup(json:string){let value:unknown;try{value=JSON.parse(json);}catch{throw new Error('O arquivo não contém JSON válido.');}if(!value||typeof value!=='object')throw new Error('Estrutura de backup inválida.');const envelope=value as Partial<BackupEnvelope>;if(envelope.format!=='tiny-dungeon-save'||envelope.version!==1)throw new Error('Formato ou versão de backup incompatível.');return cloneValidatedState(envelope.state);}
