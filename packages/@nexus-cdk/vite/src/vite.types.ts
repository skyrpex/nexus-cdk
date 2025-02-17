export interface IVite {
	readonly url: string;
}

export interface ViteProps {
	define?: Record<string, string>;
	proxy?: Record<string, string>;
	root: string;
}
