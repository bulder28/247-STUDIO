/**
 * 247 STUDIO - Official BJJ Technical Curriculum & Drill Syllabus
 * Technical checklist divided into core Brazilian Jiu-Jitsu pillars
 */

export interface CurriculumTechnique {
  id: string;
  pillar: 'ESCAPES' | 'PASSES' | 'SWEEPS' | 'SUBMISSIONS' | 'TAKEDOWNS';
  name: string;
  nameOriginal?: string;
  difficulty: 'FUNDAMENTALS' | 'INTERMEDIATE' | 'ADVANCED';
  minBelt: 'WHITE' | 'BLUE' | 'PURPLE' | 'BROWN' | 'BLACK';
  description: string;
  keyDetails: string[];
}

export const BJJ_CURRICULUM: CurriculumTechnique[] = [
  // 1. ESCAPES
  {
    id: 'esc_mount_upa',
    pillar: 'ESCAPES',
    name: 'Salida de Montada (Upa / Trap & Roll)',
    nameOriginal: 'Upa Escape',
    difficulty: 'FUNDAMENTALS',
    minBelt: 'WHITE',
    description: 'Bloqueo de brazo y pie del mismo lado con puente explosivo a 45 grados para invertir a guardia.',
    keyDetails: ['Trampear brazo al pecho', 'Pisar talon pegado a la cadera', 'Puente alto antes de girar'],
  },
  {
    id: 'esc_mount_elbow',
    pillar: 'ESCAPES',
    name: 'Salida de Montada Codo-Rodilla',
    nameOriginal: 'Elbow Escape / Shrimp',
    difficulty: 'FUNDAMENTALS',
    minBelt: 'WHITE',
    description: 'Recuperación de media guardia y guardia cerrada usando marcos de antebrazo contra cadera.',
    keyDetails: ['Ponerse de lado inmediatamente', 'Marco rigido en rodilla', 'Fuga de cadera profunda'],
  },
  {
    id: 'esc_side_frame',
    pillar: 'ESCAPES',
    name: 'Escape de Control Lateral con Marcos',
    nameOriginal: 'Side Control Frame Escape',
    difficulty: 'FUNDAMENTALS',
    minBelt: 'WHITE',
    description: 'Inserción del antebrazo en el cuello y cadera para crear espacio y meter la rodilla de regreso.',
    keyDetails: ['No permitir abrazo de cabeza plano', 'Puente hacia el rival y contragolpe de cadera', 'Insercion de tibia protectora'],
  },
  {
    id: 'esc_back_two_on_one',
    pillar: 'ESCAPES',
    name: 'Escape de Control de Espalda (2 contra 1)',
    nameOriginal: 'Back Mount Two-on-One Escape',
    difficulty: 'FUNDAMENTALS',
    minBelt: 'WHITE',
    description: 'Protección de cuello con dos manos en la mano estranguladora y deslizamiento de hombros al tatami.',
    keyDetails: ['Mentón bajo protegiendo carótidas', 'Deslizar hacia el lado donde no está el brazo sobre el hombro', 'Giro a media guardia'],
  },

  // 2. PASSES
  {
    id: 'pass_knee_slice',
    pillar: 'PASSES',
    name: 'Pase de Rodilla Cruzada (Knee Slide)',
    nameOriginal: 'Knee Slice Pass',
    difficulty: 'FUNDAMENTALS',
    minBelt: 'WHITE',
    description: 'Corte transversal con la tibia sobre el muslo del oponente manteniendo underhook profundo.',
    keyDetails: ['Underhook obligatorio para evitar toma de espalda', 'Cabeza baja presionando pecho', 'Deslizar cadera pegada'],
  },
  {
    id: 'pass_toreando',
    pillar: 'PASSES',
    name: 'Pase Toreando',
    nameOriginal: 'Bullfighter / Toreando Pass',
    difficulty: 'FUNDAMENTALS',
    minBelt: 'WHITE',
    description: 'Control de pantalones a la altura de rodillas con desvío rápido lateral y control de hombros.',
    keyDetails: ['Brazos rectos empujando', 'Cambio de angulo con paso de compás', 'Rodilla al suelo inmediatamente'],
  },
  {
    id: 'pass_over_under',
    pillar: 'PASSES',
    name: 'Pase Por Encima y Por Debajo (Over-Under)',
    nameOriginal: 'Over-Under Pass (Bernardo Faria)',
    difficulty: 'INTERMEDIATE',
    minBelt: 'BLUE',
    description: 'Presión pesada atrapando una pierna al hombro y cruzando la otra con cabeza en la cadera.',
    keyDetails: ['Cabeza clavada en el abdomen', 'Presion sobre hombro sin dejar espacio', 'Giro lento de trípode'],
  },

  // 3. SWEEPS
  {
    id: 'swp_scissor',
    pillar: 'SWEEPS',
    name: 'Raspado de Tijera',
    nameOriginal: 'Scissor Sweep',
    difficulty: 'FUNDAMENTALS',
    minBelt: 'WHITE',
    description: 'Desde guardia abierta con agarre de solapa y manga, bloqueo de rodilla baja y corte de tibia alta.',
    keyDetails: ['Ponerse de costado a 90 grados', 'Tracción simultánea de solapa y manga', 'Tijeretazo sin elevar el pie del tatami'],
  },
  {
    id: 'swp_flower',
    pillar: 'SWEEPS',
    name: 'Raspado de Péndulo / Flor',
    nameOriginal: 'Flower / Pendulum Sweep',
    difficulty: 'FUNDAMENTALS',
    minBelt: 'WHITE',
    description: 'Balanceo de pierna externa con agarre por debajo del muslo para desestabilizar hacia montada.',
    keyDetails: ['Paso de pierna libre hacia la axila', 'Giro completo de cadera', 'Llegar montado firme'],
  },

  // 4. SUBMISSIONS
  {
    id: 'sub_armbar_guard',
    pillar: 'SUBMISSIONS',
    name: 'Palanca de Brazo desde Guardia',
    nameOriginal: 'Juji Gatame / Straight Armlock',
    difficulty: 'FUNDAMENTALS',
    minBelt: 'WHITE',
    description: 'Aislamiento de codo con pivote de cadera y paso de pierna por encima de la cabeza.',
    keyDetails: ['Presionar con el talón hacia abajo la nuca', 'Rodillas juntas pellizcando el bíceps', 'Pulgar apuntando al techo'],
  },
  {
    id: 'sub_triangle',
    pillar: 'SUBMISSIONS',
    name: 'Estrangulación en Triángulo',
    nameOriginal: 'Sankaku Jime / Triangle Choke',
    difficulty: 'FUNDAMENTALS',
    minBelt: 'WHITE',
    description: 'Atrapada de un brazo dentro y uno fuera con cierre detrás de la rodilla y ajuste de carótidas.',
    keyDetails: ['Cruzar el brazo atrapado', 'Ajustar ángulo perpendicular cortando la vista', 'Tirar de la nuca con ambas manos'],
  },
  {
    id: 'sub_kimura',
    pillar: 'SUBMISSIONS',
    name: 'Llave de Hombro Kimura',
    nameOriginal: 'Kimura / Ude Garami',
    difficulty: 'FUNDAMENTALS',
    minBelt: 'WHITE',
    description: 'Agarre de cuatro dedos en figura 4 sobre la muñeca del rival rotando el hombro hacia la espalda.',
    keyDetails: ['Pecho pegado al tríceps', 'Muñeca a 90 grados estilo moto', 'Llevar mano hacia la nuca del rival'],
  },
  {
    id: 'sub_rnc',
    pillar: 'SUBMISSIONS',
    name: 'Mata-León desde la Espalda',
    nameOriginal: 'Rear Naked Choke (Mata Leão)',
    difficulty: 'FUNDAMENTALS',
    minBelt: 'WHITE',
    description: 'Codo alineado con la nuez de Adán, mano que agarra el propio bíceps y mano detrás de la nuca.',
    keyDetails: ['Ocultar mano libre tras la cabeza', 'Expansión de pecho y compresión de codos', 'Ganchos activos'],
  },

  // 5. TAKEDOWNS
  {
    id: 'take_double_leg',
    pillar: 'TAKEDOWNS',
    name: 'Entrada a Dos Piernas (Double Leg)',
    nameOriginal: 'Morote Gari / Double Leg',
    difficulty: 'FUNDAMENTALS',
    minBelt: 'WHITE',
    description: 'Paso de penetración bajando el nivel con cabeza pegada a la costilla y barrido de corvas.',
    keyDetails: ['Espalda recta y vista al frente', 'Paso de penetración profundo entre los pies del rival', 'Giro angular de volante'],
  },
  {
    id: 'take_single_leg',
    pillar: 'TAKEDOWNS',
    name: 'Entrada a Una Pierna (Single Leg)',
    nameOriginal: 'Kuchiki Taoshi / Single Leg',
    difficulty: 'FUNDAMENTALS',
    minBelt: 'WHITE',
    description: 'Captura de pierna adelantada con cabeza en el pecho y acabado con corrida de tubería (run the pipe).',
    keyDetails: ['Cabeza firme contra el esternón', 'Pegar muslo a la cadera', 'Circunvalación hacia atrás'],
  },
];
