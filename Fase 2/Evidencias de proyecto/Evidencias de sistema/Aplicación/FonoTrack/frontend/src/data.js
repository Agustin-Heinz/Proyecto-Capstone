export const ESPECIALIDADES = ["Lactancia y frenillo lingual","Deglución infantil","Rehabilitación post ACV","Deglución (disfagia)","Voz","Tartamudez","Espectro autista (TEA)","Lenguaje infantil","Motricidad orofacial"];

export const PROFESIONALES = [
  {
    id: 1, nombre: "Dra. Sofía Martínez", comuna: "Providencia", modalidad: "Presencial", rating: 5.0, resenas: 726,
    resumen: "Especialista en lactancia, frenillo lingual y deglución en bebés.",
    acerca: "Fonoaudióloga infantil con foco en los primeros meses de vida: evaluación de frenillo lingual, apoyo a la lactancia y deglución segura. Trabaja de la mano con matronas y pediatras.",
    especialidades: ["Lactancia y frenillo lingual","Deglución infantil"],
    telefono: "+56 9 3202 4343", email: "sofia.martinez@fonotrack.cl", direccion: "Av. Providencia 1234, Of. 502, Providencia",
    servicios: [
      { id: 1, nombre: "Evaluación inicial completa", modalidad: "Presencial", duracion: 50, precio: 55000, detalle: "Incluye evaluación inicial completa, observación de una toma de lactancia y plan de seguimiento." }
    ],
    reviews: [{ rating: 5, comentario: "Nos ayudó muchísimo con el frenillo lingual de nuestra hija, súper clara explicando todo." }]
  },
  {
    id: 2, nombre: "Matías Contreras", comuna: "Ñuñoa", modalidad: "Ambas", rating: 4.9, resenas: 312,
    resumen: "Rehabilitación de la comunicación y deglución tras un ACV.",
    acerca: "Doce años de experiencia en contexto hospitalario y ambulatorio, especializado en rehabilitación neurológica de adultos.",
    especialidades: ["Rehabilitación post ACV","Deglución (disfagia)"],
    telefono: "+56 9 8871 2200", email: "matias.contreras@fonotrack.cl", direccion: "Irarrázaval 3400, Of. 12, Ñuñoa",
    servicios: [
      { id: 2, nombre: "Evaluación de deglución", modalidad: "Presencial", duracion: 50, precio: 50000, detalle: "Evaluación clínica completa con informe y recomendaciones." }
    ],
    reviews: [{ rating: 5, comentario: "Acompañó a mi papá después de su ACV, muy comprometido con su recuperación." }]
  }
  // (Reduje la lista a 2 por ahora para no saturar, luego puedes copiar el resto de tu HTML)
];