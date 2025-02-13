export interface IVite {
	readonly url: string;
}

export interface ViteProps {
	proxy?: Record<string, string>;
	root: string;
}
