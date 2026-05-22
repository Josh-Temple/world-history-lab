const CLUSTERS = [
  { title: 'Trade Networks', summary: 'Exchange routes connect distant societies.', next: 'Leads into imperial expansion.' },
  { title: 'State Formation', summary: 'Institutions and authority structures emerge.', next: 'Connects to legal and tax systems.' },
  { title: 'Religious Diffusion', summary: 'Beliefs spread across regions and cultures.', next: 'Shapes trade, conflict, and identity.' },
  { title: 'Empire Expansion', summary: 'Polities scale through military and administrative power.', next: 'Leads into migration and resistance patterns.' },
  { title: 'Industrialization', summary: 'Production systems transform economies and labor.', next: 'Connects to modern state and global trade shifts.' },
];

document.getElementById('concept-map').innerHTML = CLUSTERS.map((cluster, idx) => `<article class="cluster"><h3>${idx + 1}. ${cluster.title}</h3><p>${cluster.summary}</p><p><strong>Progression:</strong> ${cluster.next}</p></article>`).join('');
