import type { Translation } from './es';

/** El tipo `Translation` obliga a tener EXACTAMENTE las mismas claves que es.ts. */
export const en: Translation = {
	meta: {
		siteTitle: 'Luisa Benítez, fashion stylist and image consultant',
		siteDescription:
			'Portfolio of Luisa Benítez, fashion stylist, image consultant and personal shopper. Editorial, campaigns, celebrity dressing, runway and film work.',
	},
	nav: {
		home: 'Home',
		editorial: 'Editorial',
		campaigns: 'Campaigns',
		celebrityEvents: 'Celebrity & Events',
		films: 'Film & TV',
		runway: 'Runway',
		about: 'About',
		contact: 'Contact',
	},
	home: {
		featuredWorkTitle: 'Featured work',
		tagline: 'Fashion stylist and assistant, fashion designer, image consultant and personal shopper',
	},
	contact: {
		pageTitle: 'Contact | Luisa Benítez',
		eyebrow: 'Contact',
		title: "Let's talk",
		lead: 'For editorial, campaign, or celebrity styling enquiries.',
		metaDescription:
			'Get in touch with Luisa Benítez, fashion stylist and image consultant, for editorial, campaign or celebrity styling enquiries.',
	},
	channels: {
		email: 'Email',
		instagram: 'Instagram',
		linkedin: 'LinkedIn',
		linkedinValue: 'Professional profile',
	},
	details: {
		base: 'Based in',
		languages: 'Languages',
		availability: 'Availability',
	},
	profile: {
		country: 'Spain',
		languages: ['Spanish (native)', 'English'],
		services: [
			'Editorial styling',
			'Campaign styling and brand collaborations',
			'Celebrity and event styling',
			'Image consulting',
			'Personal shopping',
		],
		travelNote: 'Available to travel',
	},
	/** REGLA DE ATRIBUCIÓN, innegociable: «he trabajado en» se traduce «I've worked on», nunca «I styled» — el rol real lo declara la ficha de cada proyecto. */
	about: {
		title: 'About | Luisa Benítez',
		metaDescription:
			'Luisa Benítez, fashion stylist based in A Coruña. Editorials for Numéro Netherlands, Vogue Adria and GQ México, brand campaigns and image consulting.',
		eyebrow: 'About',
		bio: [
			"If I can't find the piece I have in my head, I make it. I've cut up tights to make gloves and turned garments inside out because the original cut didn't fall the way I saw it. What I imagine, I want to see, and I find a way.",
			"I come from fashion design. I trained in Colombia before specialising in styling and image consulting in Spain, and it left me with a particular way of looking at clothes: I understand how a garment is built, not just how it looks. I've spent four years working in fashion, first in film, then as an agency assistant, and now independently. I've worked on editorials for Numéro Netherlands, Vogue Adria, GQ México and Mode Magazine, on campaigns for Bruno Magli, Alaniz, Agatha Paris and YSL, and on four Mercedes-Benz Fashion Week Madrid shows.",
			"Every brief asks for something different, and I don't treat them the same. An editorial can take maximalism, layers, texture, accessories with weight; a campaign asks for the product to lead and for the styling to step back. I enjoy the freedom of editorial more, but I respect the craft of commercial work and I know when to keep quiet. In both cases I'm after the same thing: that the look reads as the wearer's own, not as a costume.",
		],
		sections: { services: 'Services', featuredIn: 'Featured in' },
	},
	common: {
		downloadCv: 'Download CV',
		newWindowHint: '(opens in a new tab)',
		portraitAlt: 'Luisa Benítez outdoors, reading a fashion magazine',
		back: 'Back',
		skipToContent: 'Skip to content',
		languageLabel: 'Switch language',
	},
	viewer: {
		label: 'Gallery viewer',
		rail: 'Project photos and videos',
		close: 'Close the viewer',
		previous: 'Previous',
		next: 'Next',
		position: '{current} of {total}',
		openImage: 'Expand image {n} of {total}',
		openVideo: 'Expand video {n} of {total}',
		altImage: 'Image {n} of {total}: {title}',
		altVideo: 'Video {n} of {total}: {title}',
		pauseVideos: 'Pause the videos',
		playVideos: 'Resume the videos',
	},
	collections: {
		campaigns: {
			heading: 'Campaigns',
			title: 'Campaigns | Luisa Benítez',
			description: 'Brand campaigns and collaborations Luisa Benítez has worked on',
		},
		celebrityEvents: {
			heading: 'Celebrity & Events',
			title: 'Celebrity & Events | Luisa Benítez',
			description: 'Celebrity and event projects Luisa Benítez has worked on',
		},
		editorials: {
			heading: 'Editorials',
			title: 'Editorials | Luisa Benítez',
			description: 'Editorials Luisa Benítez has worked on',
		},
		films: {
			heading: 'Film & TV',
			title: 'Film & TV | Luisa Benítez',
			description: 'Film and TV projects Luisa Benítez has worked on',
		},
		runway: {
			heading: 'Runway',
			title: 'Runway | Luisa Benítez',
			description: 'Runway shows Luisa Benítez has worked on',
		},
	},
	credits: {
		role: {
			'lead-stylist': 'Stylist',
			'assistant-stylist': 'Styling Assistant',
			'wardrobe-assistant': 'Wardrobe Assistant',
			'co-stylist': 'Co-Stylist',
		},
		labels: {
			photographer: 'Photography',
			director: 'Direction',
			muah: 'Hair & Makeup',
			talent: 'Talent',
			talentAgency: 'Agency',
			artDirection: 'Art Direction',
			production: 'Production',
			location: 'Location',
		},
		format: {
			'model-test': 'Model test',
		},
	},
};
