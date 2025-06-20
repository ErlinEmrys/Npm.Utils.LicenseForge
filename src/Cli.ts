#!/usr/bin/env npx ts-node

import { Command } from 'commander';
import { ConsoleLogger } from "./Log";
import { IForgeOptions, ProcessPackages } from "./GenerateLicense";

Log.Subscribe( new ConsoleLogger );
Log.Dbg( "Program START" );

const program = new Command();

program
	.name('license-forge')
	.description('CLI to Utility for managing licenses')
	.version('0.0.1');

program.command('Forge', { isDefault: true } )
		.description('Gather all third parties licenses, compiles it together and write it as MD or JSON file.')
		.option('-s, --Source <SF>', 'Specify a path to package.json source file', './package.json')
		.option('-m, --Md-file <MDFile>', 'Specify a path to output MD file' )
		.option('-j, --Json-file <JsonFile>', 'Specify a path to output JSON file' )
		.action(async ( options: IForgeOptions ) =>
		{
			await ForgeCommand( options );
		} );

export const Main = async (args: string[]): Promise<void> => {
	await program.parseAsync(args);
};

export async function ForgeCommand( options: IForgeOptions )
{
	try
	{
		Log.Dbg( "Forge command: START", options );

		if( !options.MdFile && !options.JsonFile )
		{
			Log.Wrn( "No output specified" );
			return;
		}

		await ProcessPackages( options );
	}
	catch( e )
	{
		Log.Err( "Forge command: ERR", e );
	}
	finally
	{
		Log.Dbg( "Forge command: END" );
	}
}

Main( process.argv ).catch( reason => Log.Err( "Program FATAL ERR", reason ) );

Log.Dbg( "Program END" );
