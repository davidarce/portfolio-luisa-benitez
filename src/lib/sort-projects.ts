/**
 * Orden compartido de los listados de proyectos y de la home (criterio de
 * REVISION-v2.md §3, objetivo estratégico nº2 de 00-master-plan.md §3): el
 * trabajo donde Luisa firma como `lead-stylist` va primero, la asistencia
 * pasa a respaldo.
 *
 * Criterio de desempate, en orden:
 * 1. `role === 'lead-stylist'` antes que cualquier otro rol.
 * 2. `order` ascendente (el campo de curaduría manual que ya usaba cada listado).
 * 3. `year` descendente, como último desempate.
 *
 * `year` es opcional y hoy está vacío en los 36 proyectos: cuando falta en
 * ambos lados de la comparación, el desempate no reordena (0 - 0 = 0) y
 * `Array.prototype.sort` —estable desde ES2019— conserva el orden anterior.
 * El resultado es determinista, nunca aleatorio.
 */
interface SortableProject {
	data: {
		role: string;
		order: number;
		year?: number;
		pin?: string;
	};
}

function roleRank(role: string): number {
	return role === 'lead-stylist' ? 0 : 1;
}

// `pin` gana al orden por rol: es la decisión editorial de David y Luisa sobre
// un listado concreto, y por eso manda sobre el criterio general.
function pinRank(pin?: string): number {
	if (pin === 'first') return -1;
	if (pin === 'last') return 1;
	return 0;
}

export function sortProjects<T extends SortableProject>(
	entries: T[],
	{ aplicarPin = true }: { aplicarPin?: boolean } = {},
): T[] {
	return [...entries].sort((a, b) => {
		const pinDiff = aplicarPin ? pinRank(a.data.pin) - pinRank(b.data.pin) : 0;
		if (pinDiff !== 0) return pinDiff;

		const roleDiff = roleRank(a.data.role) - roleRank(b.data.role);
		if (roleDiff !== 0) return roleDiff;

		const orderDiff = a.data.order - b.data.order;
		if (orderDiff !== 0) return orderDiff;

		return (b.data.year ?? 0) - (a.data.year ?? 0);
	});
}
