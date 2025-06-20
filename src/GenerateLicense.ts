import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";

const MD_HEADER_FIRST_SEPARATOR = "=";
const MD_HEADER_SECOND_SEPARATOR = "-";
const MD_LINE_ENDING = "\n";

export interface IForgeOptions
{
	Source: string;
	MdFile: string;
	JsonFile: string;
}

export async function ProcessPackages( options: IForgeOptions )
{
	execFile( process.platform.startsWith( "win" ) ? "pnpm.cmd" : "pnpm", [ "licenses", "list", "--json", "--long", "-P" ], { shell: true }, ( error, stdout, stderr ) =>
	{
		if( error || stderr )
		{
			Log.Err( "(P)NPM reading error", error, stderr );
		}
		else
		{
			let data;
			if( stdout.startsWith( "No licenses in packages found" ) )
			{
				data = {};
			}
			else
			{
				data = JSON.parse( stdout );
			}

			if( options.JsonFile )
			{
				FormatJson( options, data );
			}

			if( options.MdFile )
			{
				WriteOutputMD( options, data );
			}
		}
	} );
}

function WriteOutputMD( options: IForgeOptions, data: any )
{
	let result = "";
	result = WriteHeaderMD( result, "Third party licenses", MD_HEADER_FIRST_SEPARATOR );
	result = WriteParagraphMD( result, "*This software stands on the shoulders of the following giants:*" );
	result = WriteLineMD( result );

	Object.keys( data ).forEach( ( licenseType ) =>
	{
		const array = data[ licenseType ];
		for( const fPackIndex in array )
		{
			const fPackage = array[ fPackIndex ];
			for( const i in fPackage.versions )
			{
				result = WriteHeaderMD( result, `${ fPackage.name.slice( fPackage.name.startsWith( "@" ) ? 1 : 0 ) } [${ fPackage.versions[ i ] }]`, MD_HEADER_SECOND_SEPARATOR, 1 );

				if( fPackage.homepage )
				{
					result = WriteParagraphMD( result, `Homepage: <${ fPackage.homepage }>`, 1 );
				}

				if( fPackage.author )
				{
					result = WriteParagraphMD( result, `Authors: ${ fPackage.author }`, 1 );
				}

				result = WriteLineMD( result, "License:", 1 );

				const licenseFile = GetLicenceFile( fPackage.paths[ i ] );
				if( licenseFile )
				{
					result = WriteComplexMD( result, licenseFile, 2 );
				}
				else
				{
					let url = fPackage.license;
					if( IsUrl( url ) )
					{
						result = WriteLineMD( result, `<${ url }>`, 2 );
					}
					else
					{
						url = `https://spdx.org/licenses/${url}.html`;
						if( IsUrl( url ) )
						{
							result = WriteLineMD( result, `[${ fPackage.license }](${ url })`, 2 );
						}
						else
						{
							result = WriteLineMD( result, fPackage.license, 2 );
						}
					}
				}

				result = WriteLineMD( result, undefined, 1 );
				result = WriteLineMD( result );
			}
		}
	} );

	fs.writeFileSync( options.MdFile, result, "utf-8" );
}

function WriteHeaderMD( result: string, text: string, headerSeparator: string, indentation = 0 )
{
	result = WriteLineMD( result, text, indentation );
	result = WriteLineMD( result, headerSeparator.repeat( text.length ), indentation );
	result = WriteLineMD( result, undefined, indentation );

	return result;
}

function WriteComplexMD( result: string, text: string, indentation = 0 )
{
	const lines = text.split( /\r?\n/ );
	lines.forEach( ( line ) => result = WriteLineMD( result, line, indentation ) );

	return result;
}

function WriteParagraphMD( result: string, text: string, indentation = 0 )
{
	result = WriteLineMD( result, text, indentation );
	result = WriteLineMD( result, undefined, indentation );

	return result;
}

function WriteLineMD( result: string, text: string | undefined = undefined, indentation = 0 )
{
	result = WriteIndentationMD( result, text, indentation );
	if( text )
	{
		result += text;
	}
	result += MD_LINE_ENDING;

	return result;
}

function WriteIndentationMD( result: string, text: string | undefined, indentation: number )
{
	if( indentation > 0 )
	{
		result += ">".repeat( indentation );
		if( text )
		{
			result += " ";
		}
	}

	return result;
}

function IsUrl( string: string )
{
	try
	{
		const url = new URL( string );
		return url.protocol === "http:" || url.protocol === "https:";
	}
	catch( _ )
	{
		return false;
	}
}

function GetLicenceFile( packagePath: string )
{
	const licenseFileNames = [ "LICENSE", "LICENCE", "COPYING" ];
	let licenseFileContent = undefined;

	for( const i in licenseFileNames )
	{
		const regex = new RegExp( `${ licenseFileNames[ i ] }.*?`, "i" );
		fs.readdirSync( packagePath ).some( file =>
		{
			const match = file.match( regex );
			if( match )
			{
				// console.log( "L: ", path.join( packagePath, file ) );
				licenseFileContent = fs.readFileSync( path.join( packagePath, file ) ).toString();
			}

			return match;
		} );

		if( licenseFileContent )
		{
			break;
		}
	}

	/*
	 if( !licenseFileContent )
	 {
	 console.error( `FILE NOT FOUND: ${ packagePath }` ); // eslint-disable-line no-console
	 }
	 */

	return licenseFileContent;
}

function FormatJson( options: IForgeOptions, data: any )
{
	const packages: { Name: any, Version: any, Authors: any, Homepage: any, LicenseType: any, LicenseOriginal: undefined }[] = [];
	const result = { Packages: packages };
	Object.keys( data ).forEach( ( licenseType ) =>
	{
		const array = data[ licenseType ];
		for( const fPackIndex in array )
		{
			const fPackage = array[ fPackIndex ];
			for( const i in fPackage.versions )
			{
				const packInfo = {
					Name: fPackage.name.slice( fPackage.name.startsWith( "@" ) ? 1 : 0 ), Version: fPackage.versions[ i ], Authors: fPackage.author, Homepage: fPackage.homepage, LicenseType: fPackage.license, LicenseOriginal: GetLicenceFile( fPackage.paths[ i ] ),
				};
				packages.push( packInfo );
			}
		}
	} );

	// Sort by Name
	packages.sort( ( left, right ) =>
	{
		return left.Name < right.Name ? -1 : left.Name > right.Name ? 1 : 0;
	} );

	let fileContent = JSON.stringify( result, null, "\t" );
	fileContent += "\n";

	fs.writeFileSync( options.JsonFile, fileContent, "utf-8" );
}