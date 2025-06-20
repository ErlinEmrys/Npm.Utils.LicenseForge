export interface ILog
{
	Err( message: string, ...data: any[] ): void;
	Wrn( message: string, ...data: any[] ): void;
	Log( message: string, ...data: any[] ): void;
	Inf( message: string, ...data: any[] ): void;
	Dbg( message: string, ...data: any[] ): void;

	OnSubscribe?(): void;
	OnUnsubscribe?(): void;
}

export interface ILogSink extends ILog
{
	Subscribe( log: ILog ): () => void;
}

export class ConsoleLogger implements ILog
{
	_origErr = console.error;
	_origWrn = console.warn;
	_origLog = console.log
	_origInf = console.info;
	_origDbg = console.debug;

	OnSubscribe()
	{
		console.error = this.SubstitueConsole( Log.Err );
		console.warn = this.SubstitueConsole( Log.Wrn );
		console.log = this.SubstitueConsole( Log.Log );
		console.info = this.SubstitueConsole( Log.Inf );
		console.debug = this.SubstitueConsole( Log.Dbg );
	}

	OnUnsubscribe()
	{
		console.error = this._origErr;
		console.warn = this._origWrn;
		console.log = this._origLog;
		console.info = this._origInf;
		console.debug = this._origDbg;
	}

	SubstitueConsole( callback: ( message: string, ...data: any[] ) => void )
	{
		return ( data: any[] ) =>
		{
			callback( "External code:", ...data );
		};
	}

	Err( message: string, ...data: any[] )
	{
		this._origErr( `%c${ message }`, "background-color: transparent; padding: 1px;", ...data ); // eslint-disable-line no-console
	}

	Wrn( message: string, ...data: any[] )
	{
		this._origWrn( `%c${ message }`, "background-color: transparent; padding: 1px;", ...data ); // eslint-disable-line no-console
	}

	Log( message: string, ...data: any[] )
	{
		this._origLog( `%c${ message }`, "background-color: white; color: black;padding: 1px;", ...data ); // eslint-disable-line no-console
	}

	Inf( message: string, ...data: any[] )
	{
		this._origInf( `%c${ message }`, "background-color: #92a143; color: black;padding: 1px;", ...data ); // eslint-disable-line no-console
	}

	Dbg( message: string, ...data: any[] )
	{
		this._origDbg( `%c${ message }`, "background-color: #6da0cd; color: black; padding: 1px;", ...data ); // eslint-disable-line no-console
	}
}

export class LogSink implements ILogSink
{
	_allLogs: ILog[] = [];

	Subscribe( log: ILog )
	{
		this._allLogs.push( log );
		log.OnSubscribe?.();
		return () =>
		{
			const index = this._allLogs.indexOf( log, 0 );
			if( index > -1 )
			{
				this._allLogs = this._allLogs.splice( index, 1 );
				log.OnUnsubscribe?.();
			}
		};
	}

	Err( message: string, ...data: any[] )
	{
		this.ForeachLogs( fLog =>
		{
			fLog.Err( message, ...data );
		} );
	}

	Wrn( message: string, ...data: any[] )
	{
		this.ForeachLogs( fLog =>
		{
			fLog.Wrn( message, ...data );
		} );
	}

	Log( message: string, ...data: any[] )
	{
		this.ForeachLogs( fLog =>
		{
			fLog.Log( message, ...data );
		} );
	}

	Inf( message: string, ...data: any[] )
	{
		this.ForeachLogs( fLog =>
		{
			fLog.Inf( message, ...data );
		} );
	}

	Dbg( message: string, ...data: any[] )
	{
		this.ForeachLogs( fLog =>
		{
			fLog.Dbg( message, ...data );
		} );
	}

	ForeachLogs( callback: ( item: ILog ) => void )
	{
		this._allLogs.forEach( fLog =>
		{
			callback( fLog );
		} );
	}
}

export const Log = new LogSink();
( globalThis as any ).Log = Log;

declare global
{
	const Log: ILogSink
}

export default
{
	ConsoleLogger,
	LogSink,
	Log
};
