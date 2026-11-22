/**
 * UI 이모지 → 자체 아이콘 (W-0501) — 정본 saga-web/shared/js/, 판에 sync-shared 로 복사
 * ---------------------------------------------------------------
 * 화면 글자 속 이모지(★🪙⚔📜…)를 K-0202 가 만든 glyph 그림으로 바꾼다. 글자 자리는 그대로 두고
 * 그 위에 그림만 입힌다(span 안 글자는 투명) — textContent·진단·복사가 달라지지 않는다.
 *
 *   uiicon(이름|이모지[, px])  HTML 문자열(<span class=uiicon>) — 그림 없으면 그 이모지 글자
 *   자동   문서 글자 노드의 이모지를 감싼다(지금 + MutationObserver). 그림을 한 번 읽어 본 뒤에만 입힌다
 *          → 그림 파일이 없거나 못 받으면 이모지가 그대로 남는다(폴백)
 *   캔버스 fillText·strokeText 도 그림(W-0635) — 원래 이모지 폭 칸 가운데, 그림 받기 전엔 글자
 *   끄기   window.SAGA_UIICON_OFF = true (진단이 글자를 비교할 때)
 * 이름 목록은 판 폴더 assets/ui/glyph/<이름>_64.png 파일명이 곧 정본(tools/ai-art/make_k202_icons.py LIST).
 */
(function (global) {
  'use strict';
  var BASE = (global.SAGA_UIICON_BASE || 'assets/ui/glyph/');
/*MAP:begin*/
  var MAP = {
    '🧮': 'abacus', '🩹': 'adhesive_bandage', '🎟': 'admission_tickets', '🚡': 'aerial_tramway',
    '✈': 'airplane', '🛬': 'airplane_arriving', '⚗': 'alembic', '👾': 'alien_monster',
    '🚑': 'ambulance', '⚓': 'anchor', '💢': 'anger', '⚛': 'atom',
    '🪓': 'axe', '👶': 'baby', '🍼': 'baby_bottle', '🐤': 'baby_chick',
    '🎒': 'backpack', '🧶': 'ball_of_yarn', '🎈': 'balloon', '✗': 'ballot_x',
    '📊': 'bar_chart', '🧼': 'bar_of_soap', '🧺': 'basket', '🦇': 'bat',
    '🔋': 'battery', '🐻': 'bear_face', '🛏': 'bed', '🐝': 'bee',
    '🪲': 'beetle', '🔔': 'bell', '☣': 'biohazard', '🐦': 'bird',
    '🎂': 'birthday_cake', '➶': 'black_feathered_north_east_a', '🖤': 'black_heart', '⬛': 'black_large_square',
    '✒': 'black_nib', '➡': 'black_rightwards_arrow', '➤': 'black_rightwards_arrowhead', '✂': 'black_scissors',
    '☀': 'black_sun_with_rays', '♻': 'black_universal_recycling', '🌸': 'blossom', '🌼': 'blossom',
    '🐡': 'blowfish', '📘': 'blue_book', '🫐': 'blueberries', '🐗': 'boar',
    '⚡': 'bolt', '🦴': 'bone', '📖': 'book', '🔖': 'bookmark',
    '📚': 'books', '💥': 'boom', '🍾': 'bottle_with_popping_cork', '🏹': 'bow',
    '🥣': 'bowl_with_spoon', '🥊': 'boxing_glove', '🧠': 'brain', '🧱': 'bricks',
    '🌉': 'bridge_at_night', '💼': 'briefcase', '💔': 'broken_heart', '🧹': 'broom',
    '🫧': 'bubbles', '🐛': 'bug', '🏗': 'building_construction', '💡': 'bulb',
    '🦋': 'butterfly', '🌵': 'cactus', '📅': 'calendar', '🐫': 'camel',
    '📷': 'camera', '🏕': 'camp', '🕯': 'candle', '🛶': 'canoe',
    '🎏': 'carp_streamer', '🏯': 'castle', '🐈': 'cat', '🐱': 'cat_face',
    '🔗': 'chain', '⛓': 'chains', '🪑': 'chair', '📈': 'chart_with_upwards_trend',
    '🏁': 'chequered_flag', '🌰': 'chestnut', '🐔': 'chicken', '🧒': 'child',
    '🐿': 'chipmunk', '🎪': 'circus_tent', '🏙': 'cityscape', '🧗': 'climber',
    '📋': 'clipboard', '📕': 'closed_book', '📪': 'closed_mailbox_with_lowered_', '☁': 'cloud',
    '🌩': 'cloud_with_lightning', '🌧': 'cloud_with_rain', '🌨': 'cloud_with_snow', '🌪': 'cloud_with_tornado',
    '🧥': 'coat', '⚰': 'coffin', '🪙': 'coin', '☄': 'comet',
    '🧭': 'compass', '🎊': 'confetti', '🚧': 'construction', '🎛': 'control_knobs',
    '🍳': 'cooking', '🪸': 'coral', '🏡': 'cottage', '🐄': 'cow',
    '🦀': 'crab', '📦': 'crate', '🦗': 'cricket', '🏏': 'cricket_bat_and_ball',
    '❌': 'cross_mark', '🎌': 'crossed_flags', '👑': 'crown', '🔮': 'crystal',
    '➰': 'curly_loop', '🗡': 'dagger', '🍡': 'dango', '🕶': 'dark_sunglasses',
    '🦌': 'deer', '🏬': 'department_store', '🏚': 'derelict_house_building', '🏜': 'desert',
    '🏝': 'desert_island', '🖥': 'desktop_computer', '💠': 'diamond_shape_with_a_dot_ins', '📡': 'dish',
    '🤿': 'diving_mask', '🧬': 'dna_double_helix', '🐕': 'dog', '🐶': 'dog_face',
    '🥋': 'dojo', '🐬': 'dolphin', '🫏': 'donkey', '🚪': 'door',
    '⚫': 'dot_black', '🔵': 'dot_blue', '🟤': 'dot_brown', '🟢': 'dot_green',
    '🟠': 'dot_orange', '🟣': 'dot_purple', '🔴': 'dot_red', '⚪': 'dot_white',
    '🟡': 'dot_yellow', '🫥': 'dotted_line_face', '🕊': 'dove', '🔽': 'down_pointing_small_red_tria',
    '🐉': 'dragon', '🐲': 'dragon_face', '🐪': 'dromedary_camel', '💧': 'drop',
    '🩸': 'drop_of_blood', '🥁': 'drum_with_drumsticks', '🦆': 'duck', '🦅': 'eagle',
    '🌏': 'earth_globe_asia_australia', '🌍': 'earth_globe_europe_africa', '🥚': 'egg', '🔌': 'electric_plug',
    '🔦': 'electric_torch', '🐘': 'elephant', '📩': 'envelope_with_downwards_arro', '🏰': 'european_castle',
    '🌲': 'evergreen_tree', '❗': 'exclaim', '👽': 'extraterrestrial_alien', '👁': 'eye',
    '🤫': 'face_with_finger_covering_cl', '😶': 'face_without_mouth', '🏭': 'factory', '🍂': 'fallen_leaf',
    '🪶': 'feather', '🤺': 'fencer', '🚒': 'fire_engine', '🧯': 'fire_extinguisher',
    '🧨': 'firecracker', '🎇': 'firework_sparkler', '🎆': 'fireworks', '🥇': 'first_place_medal',
    '🌓': 'first_quarter_moon', '🐟': 'fish', '🐠': 'fish_trop', '🐠x': 'fish_trop2',
    '🎣': 'fishing', '👊': 'fisted_hand', '🏴': 'flag_black', '⛳': 'flag_in_hole',
    '🚩': 'flag_red', '🏳': 'flag_white', '🔥': 'flame', '⚜': 'fleur_de_lis',
    '💪': 'flexed_biceps', '💾': 'floppy_disk', '🎴': 'flower_playing_cards', '🪰': 'fly',
    '🌫': 'fog', '🪭': 'folding_hand_fan', '👣': 'footprints', '🚶': 'footsteps',
    '⛲': 'fountain', '🍀': 'four_leaf_clover', '🦊': 'fox_face', '🖼': 'frame_with_picture',
    '🐸': 'frog_face', '⛽': 'fuel_pump', '⚱': 'funeral_urn', '🌌': 'galaxy',
    '🎲': 'game_die', '🧄': 'garlic', '⚙': 'gear', '💎': 'gem',
    '🔷': 'gem_blue', '👻': 'ghost', '🎁': 'gift', '🫚': 'ginger_root',
    '🥛': 'glass_of_milk', '🌐': 'globe_with_meridians', '🧤': 'gloves', '🌟': 'glowing_star',
    '🥅': 'goal_net', '🐐': 'goat', '🥽': 'goggles', '🎓': 'gradcap',
    '🍇': 'grapes', '🪦': 'grave', '📗': 'green_book', '🥬': 'greens',
    '🏛': 'hall', '🔨': 'hammer', '⚒': 'hammer_and_pick', '🛠': 'hammer_and_wrench',
    '🤝': 'handshake', '🙋': 'happy_person_raising_one_han', '♥': 'heart', '❤': 'heart',
    '💚': 'heart_green', '💗': 'heart_pink', '💞': 'hearts_two', '⭕': 'heavy_large_circle',
    '➖': 'heavy_minus', '✖': 'heavy_multiplication_x', '➕': 'heavy_plus', '➜': 'heavy_round_tipped_rightward',
    '🦔': 'hedgehog', '🪖': 'helmet', '⛑': 'helmet_with_white_cross', '🌿': 'herb',
    '🌺': 'hibiscus', '🔆': 'high_brightness', '🥾': 'hiking_boot', '🔪': 'hocho',
    '🕳': 'hole', '🍯': 'honey_pot', '🐎': 'horse', '🐴': 'horse2',
    '🏇': 'horse_rider', '⏳': 'hourglass', '🏠': 'house', '🛖': 'hut',
    '🪻': 'hyacinth', '🧊': 'ice', '📨': 'incoming_envelope', '🔣': 'input_fors',
    '🎎': 'japanese_dolls', '👖': 'jeans', '🦘': 'kangaroo', '👘': 'kimono',
    '🪁': 'kite', '🧎': 'kneeling_person', '🥼': 'lab_coat', '🏷': 'label',
    '🪜': 'ladder', '🐞': 'lady_beetle', '🏮': 'lantern', '🟦': 'large_blue_square',
    '🟫': 'large_brown_square', '🟩': 'large_green_square', '🔶': 'large_orange_diamond', '🟪': 'large_purple_square',
    '🟨': 'large_yellow_square', '🌗': 'last_quarter_moon', '🍃': 'leaf_fluttering_in_wind', '🗨': 'left_speech_bubble',
    '🦵': 'leg', '🍋': 'lemon', '🐆': 'leopard', '✉': 'letter',
    '🦁': 'lion_face', '🦎': 'lizard', '🦙': 'llama', '🔒': 'lock',
    '🔏': 'lock_with_ink_pen', '🪷': 'lotus', '🖋': 'lower_left_fountain_pen', '🖌': 'lower_left_paintbrush',
    '🪄': 'magic_wand', '🧲': 'magnet', '🔍': 'magnifier', '🦣': 'mammoth',
    '🕰': 'mantelpiece_clock', '🗺': 'map', '🍁': 'maple_leaf', '🍖': 'meat',
    '🦾': 'mechanical_arm', '🦿': 'mechanical_leg', '🎖': 'medal', '🏅': 'medal2',
    '📣': 'megaphone', '📝': 'memo', '🦠': 'microbe', '🎤': 'microphone',
    '🔬': 'microscope', '🪞': 'mirror', '📱': 'mobile_phone', '💰': 'moneybag',
    '🐒': 'monkey', '🌙': 'moon', '🌕': 'moon_full', '🌑': 'moon_new',
    '🕌': 'mosque', '🦟': 'mosquito', '🛣': 'motorway', '🗻': 'mount_fuji',
    '⛰': 'mountain', '🎥': 'movie_camera', '☘': 'mugwort', '🎶': 'multiple_musical_notes',
    '🍄': 'mushroom', '🎵': 'musical_note', '🎼': 'musical_score', '📛': 'name_badge',
    '🧿': 'nazar_amulet', '📰': 'newspaper', '🥷': 'ninja', '⛔': 'no_entry',
    '🚫': 'no_entry', '📓': 'notebook', '🔩': 'nut_and_bolt', '🐙': 'octopus',
    '🍢': 'oden', '🏢': 'office_building', '🗝': 'old_key', '🧓': 'older_adult',
    '🕉': 'om', '👹': 'oni', '📭': 'open_mailbox_with_lowered_fl', '📬': 'open_mailbox_with_raised_fla',
    '🧡': 'orange_heart', '🦉': 'owl', '🐂': 'ox', '🦪': 'oyster',
    '📄': 'page_facing_up', '📃': 'page_with_curl', '🎨': 'palette', '🌴': 'palm_tree',
    '🤲': 'palms_up_together', '🥞': 'pancakes', '🐼': 'panda_face', '🪂': 'parachute',
    '🎉': 'party_popper', '♟': 'pawn', '🐾': 'pawprint', '🍑': 'peach',
    '🥜': 'peanuts', '🍐': 'pear', '👥': 'people', '🎭': 'performing_arts',
    '👤': 'person', '🧑': 'person2', '🙇': 'person_bowing_deeply', '🧘': 'person_in_lotus_position',
    '💻': 'personal_computer', '🧫': 'petri_dish', '⛏': 'pick', '🐖': 'pig',
    '💊': 'pill', '🩷': 'pink_heart', '🔫': 'pistol', '🚨': 'police_cars_revolving_light',
    '🐩': 'poodle', '📯': 'postal_horn', '📮': 'postbox', '🥔': 'potato',
    '🧪': 'potion', '🪴': 'potted_plant', '👝': 'pouch', '🍗': 'poultry_leg',
    '🙏': 'prayer', '📿': 'prayer_beads', '📢': 'public_address_loudspeaker', '💜': 'purple_heart',
    '📌': 'pushpin', '🧩': 'puzzle', '❓': 'question_red', '❔': 'question_red',
    '🐇': 'rabbit', '🏎': 'racing_car', '🏍': 'racing_motorcycle', '📻': 'radio',
    '☢': 'radioactive', '🌈': 'rainbow', '🤚': 'raised_back_of_hand', '✊': 'raised_fist',
    '✋': 'raised_hand', '🐀': 'rat', '🚙': 'recreational_vehicle', '🍎': 'red_apple',
    '🧧': 'red_gift_envelope', '🎗': 'reminder_ribbon', '🦏': 'rhinoceros', '🎀': 'ribbon',
    '🍚': 'rice', '🔎': 'right_pointing_magnifying_gl', '💍': 'ring', '🪐': 'ringed_planet',
    '🤖': 'robot', '🪨': 'rock', '🚀': 'rocket', '🗞': 'rolled_up_newspaper',
    '🪢': 'rope', '🌹': 'rose', '🏵': 'rosette', '📍': 'round_pushpin',
    '🚣': 'rowboat', '🏃': 'runner', '🦺': 'safety_vest', '⛵': 'sailboat',
    '🍶': 'sake_bottle_and_cup', '🧂': 'salt_shaker', '🛰': 'satellite', '🦕': 'sauropod',
    '⚖': 'scales', '🧣': 'scarf', '📜': 'scroll', '💺': 'seat',
    '🥈': 'second_place_medal', '🥘': 'shallow_pan_of_food', '🦈': 'shark', '🐑': 'sheep',
    '🐚': 'shell', '🛡': 'shield', '🚢': 'ship', '🌠': 'shooting_star',
    '🏪': 'shop', '🛍': 'shopping_bags', '🛒': 'shopping_trolley', '🪧': 'signboard',
    '🗾': 'silhouette_of_japan', '🛹': 'skateboard', '💀': 'skull', '☠': 'skull_bones',
    '💤': 'sleeping', '🛌': 'sleeping_accommodation', '🕵': 'sleuth_or_spy', '🙂': 'slightly_smiling_face',
    '🛩': 'small_airplane', '😈': 'smiling_face_with_horns', '😊': 'smiling_face_with_smiling_ey', '🐌': 'snail',
    '🐍': 'snake', '❄': 'snow', '🏔': 'snow_mtn', '🔜': 'soon_with_rightwards_arrow_a',
    '✨': 'sparkle', '🗣': 'speaker', '🔇': 'speaker_with_cancellation_st', '🔊': 'speaker_with_three_sound_wav',
    '💬': 'speech', '🚤': 'speedboat', '🕷': 'spider', '🕸': 'spider_web',
    '🗓': 'spiral_calendar_pad', '💦': 'splashing_sweat', '🌱': 'sprout', '⛶': 'square_four_corners',
    '🦑': 'squid', '⚕': 'staff_of_aesculapius', '🧍': 'standing_person', '★': 'star',
    '🗿': 'statue', '🚂': 'steam_locomotive', '🩺': 'stethoscope', '🍲': 'stew',
    '📏': 'straight_ruler', '🎙': 'studio_microphone', '🌞': 'sun_with_face', '🌻': 'sunflower',
    '🌅': 'sunrise', '🌄': 'sunrise_over_mountains', '🌇': 'sunset_over_buildings', '🏊': 'swimmer',
    '⚔': 'swords', '🦖': 't_rex', '👕': 't_shirt', '🎋': 'tanabata_tree',
    '🍊': 'tangerine', '🎯': 'target', '🍵': 'teacup_without_handle', '🔭': 'telescope',
    '📺': 'television', '👺': 'tengu', '⛺': 'tent', '🌡': 'thermometer',
    '🥉': 'third_place_medal', '💭': 'thought', '🧵': 'thread', '🖱': 'three_button_mouse',
    '⛈': 'thunder_cloud_and_rain', '🎫': 'ticket', '🐅': 'tiger', '🐯': 'tiger_face',
    '🍅': 'tomato', '🧰': 'toolbox', '🦷': 'tooth', '🎩': 'top_hat',
    '⛩': 'torii', '🗼': 'tower', '🚆': 'train', '🌳': 'tree',
    '📐': 'triangular_ruler', '🔱': 'trident_emblem', '🏆': 'trophy', '🚚': 'truck',
    '🌷': 'tulip', '🐢': 'turtle', '🛸': 'ufo', '🔺': 'up_pointing_red_triangle',
    '🏺': 'vase', '🚦': 'vertical_traffic_light', '🎮': 'video_game', '🏘': 'village',
    '🎻': 'violin', '🌋': 'volcano', '⚠': 'warning', '🌊': 'wave',
    '👋': 'waving_hand', '🏋': 'weight_lifter', '🐋': 'whale', '🌾': 'wheat',
    '🛞': 'wheel', '☸': 'wheel_of_dharma', '🌀': 'whirl', '🤍': 'white_heart',
    '♡': 'white_heart_suit', '⬜': 'white_large_square', '☆': 'white_star', '🌦': 'white_sun_behind_cloud_with_',
    '🥀': 'wilted_flower', '💨': 'wind', '🌬': 'wind_blowing_face', '🎐': 'wind_chime',
    '🍷': 'wine_glass', '🪽': 'wing', '🧙': 'wizard_hat', '🐺': 'wolf_face',
    '👢': 'womans_boots', '🪵': 'wood', '🪱': 'worm', '🔧': 'wrench',
    '✍': 'writing_hand', '🩻': 'x_ray', '💛': 'yellow_heart', '☯': 'yinyang',
    '🦓': 'zebra_face', '🧟': 'zombie'
  };
  var GAMES = {
    go: 'abacus adhesive_bandage admission_tickets aerial_tramway airplane airplane_arriving alembic alien_monster ambulance anchor anger atom axe baby baby_bottle baby_chick backpack ball_of_yarn balloon ballot_x bar_chart bar_of_soap basket bat battery bear_face bed bee beetle bell biohazard bird birthday_cake black_feathered_north_east_a black_heart black_large_square black_nib black_rightwards_arrow black_rightwards_arrowhead black_scissors black_sun_with_rays black_universal_recycling blossom blowfish blue_book blueberries boar bolt bone book bookmark books boom bottle_with_popping_cork bow bowl_with_spoon boxing_glove brain bricks bridge_at_night briefcase broken_heart broom bubbles bug building_construction bulb butterfly cactus calendar camel camera camp candle canoe carp_streamer castle cat cat_face chain chains chair chart_with_upwards_trend chequered_flag chestnut chicken child chipmunk circus_tent cityscape climber clipboard closed_book closed_mailbox_with_lowered_ cloud cloud_with_lightning cloud_with_rain cloud_with_snow cloud_with_tornado coat coffin coin comet compass confetti construction control_knobs cooking coral cottage cow crab crate cricket cricket_bat_and_ball cross_mark crossed_flags crown crystal curly_loop dagger dango dark_sunglasses deer department_store derelict_house_building desert desert_island desktop_computer diamond_shape_with_a_dot_ins dish diving_mask dna_double_helix dog dog_face dojo dolphin donkey door dot_black dot_blue dot_brown dot_green dot_orange dot_purple dot_red dot_white dot_yellow dotted_line_face dove down_pointing_small_red_tria dragon dragon_face dromedary_camel drop drop_of_blood drum_with_drumsticks duck eagle earth_globe_asia_australia earth_globe_europe_africa egg electric_plug electric_torch elephant envelope_with_downwards_arro european_castle evergreen_tree exclaim extraterrestrial_alien eye face_with_finger_covering_cl face_without_mouth factory fallen_leaf feather fencer fire_engine fire_extinguisher firecracker firework_sparkler fireworks first_place_medal first_quarter_moon fish fish_trop fishing fisted_hand flag_black flag_in_hole flag_red flag_white flame fleur_de_lis flexed_biceps floppy_disk flower_playing_cards fly fog folding_hand_fan footprints footsteps fountain four_leaf_clover fox_face frame_with_picture frog_face fuel_pump funeral_urn galaxy game_die garlic gear gem gem_blue ghost gift ginger_root glass_of_milk globe_with_meridians gloves glowing_star goal_net goat goggles gradcap grapes grave green_book greens hall hammer hammer_and_pick hammer_and_wrench handshake happy_person_raising_one_han heart heart_green heart_pink hearts_two heavy_large_circle heavy_minus heavy_multiplication_x heavy_plus heavy_round_tipped_rightward hedgehog helmet helmet_with_white_cross herb hibiscus high_brightness hiking_boot hocho hole honey_pot horse horse2 horse_rider house hut hyacinth ice incoming_envelope input_fors japanese_dolls jeans kangaroo kimono kite kneeling_person lab_coat label ladder lady_beetle lantern large_blue_square large_brown_square large_green_square large_orange_diamond large_purple_square large_yellow_square last_quarter_moon leaf_fluttering_in_wind left_speech_bubble leg lemon leopard letter lion_face lizard llama lock lock_with_ink_pen lotus lower_left_fountain_pen lower_left_paintbrush magic_wand magnet magnifier mammoth mantelpiece_clock map maple_leaf meat mechanical_arm mechanical_leg medal medal2 megaphone memo microbe microphone microscope mirror mobile_phone moneybag monkey moon moon_full moon_new mosque mosquito motorway mount_fuji mountain movie_camera mugwort multiple_musical_notes mushroom musical_note musical_score name_badge nazar_amulet newspaper ninja no_entry notebook nut_and_bolt octopus oden office_building old_key older_adult om oni open_mailbox_with_lowered_fl open_mailbox_with_raised_fla orange_heart owl ox oyster page_facing_up page_with_curl palette palm_tree palms_up_together pancakes panda_face parachute party_popper pawn pawprint peach peanuts pear people performing_arts person person2 person_bowing_deeply person_in_lotus_position personal_computer petri_dish pick pig pill pink_heart pistol police_cars_revolving_light poodle postal_horn postbox potato potion potted_plant pouch poultry_leg prayer prayer_beads public_address_loudspeaker purple_heart pushpin puzzle question_red rabbit racing_car racing_motorcycle radio radioactive rainbow raised_back_of_hand raised_fist raised_hand rat recreational_vehicle red_apple red_gift_envelope reminder_ribbon rhinoceros ribbon rice right_pointing_magnifying_gl ring ringed_planet robot rock rocket rolled_up_newspaper rope rose rosette round_pushpin rowboat runner safety_vest sailboat sake_bottle_and_cup salt_shaker satellite sauropod scales scarf scroll seat second_place_medal shallow_pan_of_food shark sheep shell shield ship shooting_star shop shopping_bags shopping_trolley signboard silhouette_of_japan skateboard skull skull_bones sleeping sleeping_accommodation sleuth_or_spy slightly_smiling_face small_airplane smiling_face_with_horns smiling_face_with_smiling_ey snail snake snow snow_mtn soon_with_rightwards_arrow_a sparkle speaker speaker_with_cancellation_st speaker_with_three_sound_wav speech speedboat spider spider_web spiral_calendar_pad splashing_sweat sprout square_four_corners squid staff_of_aesculapius standing_person star statue steam_locomotive stethoscope stew straight_ruler studio_microphone sun_with_face sunflower sunrise sunrise_over_mountains sunset_over_buildings swimmer swords t_rex t_shirt tanabata_tree tangerine target teacup_without_handle telescope television tengu tent thermometer third_place_medal thought thread three_button_mouse thunder_cloud_and_rain ticket tiger tiger_face tomato toolbox tooth top_hat torii tower train tree triangular_ruler trident_emblem trophy truck tulip turtle ufo up_pointing_red_triangle vase vertical_traffic_light video_game village violin volcano warning wave waving_hand weight_lifter whale wheat wheel wheel_of_dharma whirl white_heart white_heart_suit white_large_square white_star white_sun_behind_cloud_with_ wilted_flower wind wind_blowing_face wind_chime wine_glass wing wizard_hat wolf_face womans_boots wood worm wrench writing_hand x_ray yellow_heart yinyang zebra_face zombie',
    dungeon: 'abacus adhesive_bandage admission_tickets aerial_tramway airplane airplane_arriving alembic alien_monster ambulance anchor anger atom axe baby baby_bottle baby_chick backpack ball_of_yarn balloon ballot_x bar_chart bar_of_soap basket bat battery bear_face bed bee beetle bell biohazard bird birthday_cake black_feathered_north_east_a black_heart black_large_square black_nib black_rightwards_arrow black_rightwards_arrowhead black_scissors black_sun_with_rays black_universal_recycling blossom blowfish blue_book blueberries boar bolt bone book bookmark books boom bottle_with_popping_cork bow bowl_with_spoon boxing_glove brain bricks bridge_at_night briefcase broken_heart broom bubbles bug building_construction bulb butterfly cactus calendar camel camera camp candle canoe carp_streamer castle cat cat_face chain chains chair chart_with_upwards_trend chequered_flag chestnut chicken child chipmunk circus_tent cityscape climber clipboard closed_book closed_mailbox_with_lowered_ cloud cloud_with_lightning cloud_with_rain cloud_with_snow cloud_with_tornado coat coffin coin comet compass confetti construction control_knobs cooking coral cottage cow crab crate cricket cricket_bat_and_ball cross_mark crossed_flags crown crystal curly_loop dagger dango dark_sunglasses deer department_store derelict_house_building desert desert_island desktop_computer diamond_shape_with_a_dot_ins dish diving_mask dna_double_helix dog dog_face dojo dolphin donkey door dot_black dot_blue dot_brown dot_green dot_orange dot_purple dot_red dot_white dot_yellow dotted_line_face dove down_pointing_small_red_tria dragon dragon_face dromedary_camel drop drop_of_blood drum_with_drumsticks duck eagle earth_globe_asia_australia earth_globe_europe_africa egg electric_plug electric_torch elephant envelope_with_downwards_arro european_castle evergreen_tree exclaim extraterrestrial_alien eye face_with_finger_covering_cl face_without_mouth factory fallen_leaf feather fencer fire_engine fire_extinguisher firecracker firework_sparkler fireworks first_place_medal first_quarter_moon fish fish_trop fishing fisted_hand flag_black flag_in_hole flag_red flag_white flame fleur_de_lis flexed_biceps floppy_disk flower_playing_cards fly fog folding_hand_fan footprints footsteps fountain four_leaf_clover fox_face frame_with_picture frog_face fuel_pump funeral_urn galaxy game_die garlic gear gem gem_blue ghost gift ginger_root glass_of_milk globe_with_meridians gloves glowing_star goal_net goat goggles gradcap grapes grave green_book greens hall hammer hammer_and_pick hammer_and_wrench handshake happy_person_raising_one_han heart heart_green heart_pink hearts_two heavy_large_circle heavy_minus heavy_multiplication_x heavy_plus heavy_round_tipped_rightward hedgehog helmet helmet_with_white_cross herb hibiscus high_brightness hiking_boot hocho hole honey_pot horse horse2 horse_rider house hut hyacinth ice incoming_envelope input_fors japanese_dolls jeans kangaroo kimono kite kneeling_person lab_coat label ladder lady_beetle lantern large_blue_square large_brown_square large_green_square large_orange_diamond large_purple_square large_yellow_square last_quarter_moon leaf_fluttering_in_wind left_speech_bubble leg lemon leopard letter lion_face lizard llama lock lock_with_ink_pen lotus lower_left_fountain_pen lower_left_paintbrush magic_wand magnet magnifier mammoth mantelpiece_clock map maple_leaf meat mechanical_arm mechanical_leg medal medal2 megaphone memo microbe microphone microscope mirror mobile_phone moneybag monkey moon moon_full moon_new mosque mosquito motorway mount_fuji mountain movie_camera mugwort multiple_musical_notes mushroom musical_note musical_score name_badge nazar_amulet newspaper ninja no_entry notebook nut_and_bolt octopus oden office_building old_key older_adult om oni open_mailbox_with_lowered_fl open_mailbox_with_raised_fla orange_heart owl ox oyster page_facing_up page_with_curl palette palm_tree palms_up_together pancakes panda_face parachute party_popper pawn pawprint peach peanuts pear people performing_arts person person2 person_bowing_deeply person_in_lotus_position personal_computer petri_dish pick pig pill pink_heart pistol police_cars_revolving_light poodle postal_horn postbox potato potion potted_plant pouch poultry_leg prayer prayer_beads public_address_loudspeaker purple_heart pushpin puzzle question_red rabbit racing_car racing_motorcycle radio radioactive rainbow raised_back_of_hand raised_fist raised_hand rat recreational_vehicle red_apple red_gift_envelope reminder_ribbon rhinoceros ribbon rice right_pointing_magnifying_gl ring ringed_planet robot rock rocket rolled_up_newspaper rope rose rosette round_pushpin rowboat runner safety_vest sailboat sake_bottle_and_cup salt_shaker satellite sauropod scales scarf scroll seat second_place_medal shallow_pan_of_food shark sheep shell shield ship shooting_star shop shopping_bags shopping_trolley signboard silhouette_of_japan skateboard skull skull_bones sleeping sleeping_accommodation sleuth_or_spy slightly_smiling_face small_airplane smiling_face_with_horns smiling_face_with_smiling_ey snail snake snow snow_mtn soon_with_rightwards_arrow_a sparkle speaker speaker_with_cancellation_st speaker_with_three_sound_wav speech speedboat spider spider_web spiral_calendar_pad splashing_sweat sprout square_four_corners squid staff_of_aesculapius standing_person star statue steam_locomotive stethoscope stew straight_ruler studio_microphone sun_with_face sunflower sunrise sunrise_over_mountains sunset_over_buildings swimmer swords t_rex t_shirt tanabata_tree tangerine target teacup_without_handle telescope television tengu tent thermometer third_place_medal thought thread three_button_mouse thunder_cloud_and_rain ticket tiger tiger_face tomato toolbox tooth top_hat torii tower train tree triangular_ruler trident_emblem trophy truck tulip turtle ufo up_pointing_red_triangle vase vertical_traffic_light video_game village violin volcano wave waving_hand weight_lifter whale wheat wheel wheel_of_dharma whirl white_heart white_heart_suit white_large_square white_star white_sun_behind_cloud_with_ wilted_flower wind wind_blowing_face wind_chime wine_glass wing wizard_hat wolf_face womans_boots wood worm wrench writing_hand x_ray yellow_heart yinyang zebra_face zombie',
    forest: 'abacus adhesive_bandage admission_tickets aerial_tramway airplane airplane_arriving alembic alien_monster ambulance anchor anger atom axe baby baby_bottle baby_chick backpack ball_of_yarn balloon ballot_x bar_chart bar_of_soap basket bat battery bear_face bed bee beetle bell biohazard bird birthday_cake black_feathered_north_east_a black_heart black_large_square black_nib black_rightwards_arrow black_rightwards_arrowhead black_scissors black_sun_with_rays black_universal_recycling blossom blowfish blue_book blueberries boar bolt bone book bookmark books boom bottle_with_popping_cork bow bowl_with_spoon boxing_glove brain bricks bridge_at_night briefcase broken_heart broom bubbles bug building_construction bulb butterfly cactus calendar camel camera camp candle canoe carp_streamer castle cat cat_face chain chains chair chart_with_upwards_trend chequered_flag chestnut chicken child chipmunk circus_tent cityscape climber clipboard closed_book closed_mailbox_with_lowered_ cloud cloud_with_lightning cloud_with_rain cloud_with_snow cloud_with_tornado coat coffin coin comet compass confetti construction control_knobs cooking coral cottage cow crab crate cricket cricket_bat_and_ball cross_mark crossed_flags crown crystal curly_loop dagger dango dark_sunglasses deer department_store derelict_house_building desert desert_island desktop_computer diamond_shape_with_a_dot_ins dish diving_mask dna_double_helix dog dog_face dojo dolphin donkey door dot_black dot_blue dot_brown dot_green dot_orange dot_purple dot_red dot_white dot_yellow dotted_line_face dove down_pointing_small_red_tria dragon dragon_face dromedary_camel drop drop_of_blood drum_with_drumsticks duck eagle earth_globe_asia_australia earth_globe_europe_africa egg electric_plug electric_torch elephant envelope_with_downwards_arro european_castle evergreen_tree exclaim extraterrestrial_alien eye face_with_finger_covering_cl face_without_mouth factory fallen_leaf feather fencer fire_engine fire_extinguisher firecracker firework_sparkler fireworks first_place_medal first_quarter_moon fish fish_trop fishing fisted_hand flag_black flag_in_hole flag_red flag_white flame fleur_de_lis flexed_biceps floppy_disk flower_playing_cards fly fog folding_hand_fan footprints footsteps fountain four_leaf_clover fox_face frame_with_picture frog_face fuel_pump funeral_urn galaxy game_die garlic gear gem gem_blue ghost gift ginger_root glass_of_milk globe_with_meridians gloves glowing_star goal_net goat goggles gradcap grapes grave green_book greens hall hammer hammer_and_pick hammer_and_wrench handshake happy_person_raising_one_han heart heart_green heart_pink hearts_two heavy_large_circle heavy_minus heavy_multiplication_x heavy_plus heavy_round_tipped_rightward hedgehog helmet helmet_with_white_cross herb hibiscus high_brightness hiking_boot hocho hole honey_pot horse horse2 horse_rider house hut hyacinth ice incoming_envelope input_fors japanese_dolls jeans kangaroo kimono kite kneeling_person lab_coat label ladder lady_beetle lantern large_blue_square large_brown_square large_green_square large_orange_diamond large_purple_square large_yellow_square last_quarter_moon leaf_fluttering_in_wind left_speech_bubble leg lemon leopard letter lion_face lizard llama lock lock_with_ink_pen lotus lower_left_fountain_pen lower_left_paintbrush magic_wand magnet magnifier mammoth mantelpiece_clock map maple_leaf meat mechanical_arm mechanical_leg medal medal2 megaphone memo microbe microphone microscope mirror mobile_phone moneybag monkey moon moon_full moon_new mosque mosquito motorway mount_fuji mountain movie_camera mugwort multiple_musical_notes mushroom musical_note musical_score name_badge nazar_amulet newspaper ninja no_entry notebook nut_and_bolt octopus oden office_building old_key older_adult om oni open_mailbox_with_lowered_fl open_mailbox_with_raised_fla orange_heart owl ox oyster page_facing_up page_with_curl palette palm_tree palms_up_together pancakes panda_face parachute party_popper pawn pawprint peach peanuts pear people performing_arts person person2 person_bowing_deeply person_in_lotus_position personal_computer petri_dish pick pig pill pink_heart pistol police_cars_revolving_light poodle postal_horn postbox potato potion potted_plant pouch poultry_leg prayer prayer_beads public_address_loudspeaker purple_heart pushpin puzzle question_red rabbit racing_car racing_motorcycle radio radioactive rainbow raised_back_of_hand raised_fist raised_hand rat recreational_vehicle red_apple red_gift_envelope reminder_ribbon rhinoceros ribbon rice right_pointing_magnifying_gl ring ringed_planet robot rock rocket rolled_up_newspaper rope rose rosette round_pushpin rowboat runner safety_vest sailboat sake_bottle_and_cup salt_shaker satellite sauropod scales scarf scroll seat second_place_medal shallow_pan_of_food shark sheep shell shield ship shooting_star shop shopping_bags shopping_trolley signboard silhouette_of_japan skateboard skull skull_bones sleeping sleeping_accommodation sleuth_or_spy slightly_smiling_face small_airplane smiling_face_with_horns smiling_face_with_smiling_ey snail snake snow snow_mtn soon_with_rightwards_arrow_a sparkle speaker speaker_with_cancellation_st speaker_with_three_sound_wav speech speedboat spider spider_web spiral_calendar_pad splashing_sweat sprout square_four_corners squid staff_of_aesculapius standing_person star statue steam_locomotive stethoscope stew straight_ruler studio_microphone sun_with_face sunflower sunrise sunrise_over_mountains sunset_over_buildings swimmer swords t_rex t_shirt tanabata_tree tangerine target teacup_without_handle telescope television tengu tent thermometer third_place_medal thought thread three_button_mouse thunder_cloud_and_rain ticket tiger tiger_face tomato toolbox tooth top_hat torii tower train tree triangular_ruler trident_emblem trophy truck tulip turtle ufo up_pointing_red_triangle vase vertical_traffic_light video_game village violin volcano wave waving_hand weight_lifter whale wheat wheel wheel_of_dharma whirl white_heart white_heart_suit white_large_square white_star white_sun_behind_cloud_with_ wilted_flower wind wind_blowing_face wind_chime wine_glass wing wizard_hat wolf_face womans_boots wood worm wrench writing_hand x_ray yellow_heart yinyang zebra_face zombie',
    story: 'abacus adhesive_bandage admission_tickets aerial_tramway airplane airplane_arriving alembic alien_monster ambulance anchor anger atom axe baby baby_bottle baby_chick backpack ball_of_yarn balloon ballot_x bar_chart bar_of_soap basket bat battery bear_face bed bee beetle bell biohazard bird birthday_cake black_feathered_north_east_a black_heart black_large_square black_nib black_rightwards_arrow black_rightwards_arrowhead black_scissors black_sun_with_rays black_universal_recycling blossom blowfish blue_book blueberries boar bolt bone book bookmark books boom bottle_with_popping_cork bow bowl_with_spoon boxing_glove brain bricks bridge_at_night briefcase broken_heart broom bubbles bug building_construction bulb butterfly cactus calendar camel camera camp candle canoe carp_streamer castle cat cat_face chain chains chair chart_with_upwards_trend chequered_flag chestnut chicken child chipmunk circus_tent cityscape climber clipboard closed_book closed_mailbox_with_lowered_ cloud cloud_with_lightning cloud_with_rain cloud_with_snow cloud_with_tornado coat coffin coin comet compass confetti construction control_knobs cooking coral cottage cow crab crate cricket cricket_bat_and_ball cross_mark crossed_flags crown crystal curly_loop dagger dango dark_sunglasses deer department_store derelict_house_building desert desert_island desktop_computer diamond_shape_with_a_dot_ins dish diving_mask dna_double_helix dog dog_face dojo dolphin donkey door dot_black dot_blue dot_brown dot_green dot_orange dot_purple dot_red dot_white dot_yellow dotted_line_face dove down_pointing_small_red_tria dragon dragon_face dromedary_camel drop drop_of_blood drum_with_drumsticks duck eagle earth_globe_asia_australia earth_globe_europe_africa egg electric_plug electric_torch elephant envelope_with_downwards_arro european_castle evergreen_tree exclaim extraterrestrial_alien eye face_with_finger_covering_cl face_without_mouth factory fallen_leaf feather fencer fire_engine fire_extinguisher firecracker firework_sparkler fireworks first_place_medal first_quarter_moon fish fish_trop fishing fisted_hand flag_black flag_in_hole flag_red flag_white flame fleur_de_lis flexed_biceps floppy_disk flower_playing_cards fly fog folding_hand_fan footprints footsteps fountain four_leaf_clover fox_face frame_with_picture frog_face fuel_pump funeral_urn galaxy game_die garlic gear gem gem_blue ghost gift ginger_root glass_of_milk globe_with_meridians gloves glowing_star goal_net goat goggles gradcap grapes grave green_book greens hall hammer hammer_and_pick hammer_and_wrench handshake happy_person_raising_one_han heart heart_green heart_pink hearts_two heavy_large_circle heavy_minus heavy_multiplication_x heavy_plus heavy_round_tipped_rightward hedgehog helmet helmet_with_white_cross herb hibiscus high_brightness hiking_boot hocho hole honey_pot horse horse2 horse_rider house hut hyacinth ice incoming_envelope input_fors japanese_dolls jeans kangaroo kimono kite kneeling_person lab_coat label ladder lady_beetle lantern large_blue_square large_brown_square large_green_square large_orange_diamond large_purple_square large_yellow_square last_quarter_moon leaf_fluttering_in_wind left_speech_bubble leg lemon leopard letter lion_face lizard llama lock lock_with_ink_pen lotus lower_left_fountain_pen lower_left_paintbrush magic_wand magnet magnifier mammoth mantelpiece_clock map maple_leaf meat mechanical_arm mechanical_leg medal medal2 megaphone memo microbe microphone microscope mirror mobile_phone moneybag monkey moon moon_full moon_new mosque mosquito motorway mount_fuji mountain movie_camera mugwort multiple_musical_notes mushroom musical_note musical_score name_badge nazar_amulet newspaper ninja no_entry notebook nut_and_bolt octopus oden office_building old_key older_adult om oni open_mailbox_with_lowered_fl open_mailbox_with_raised_fla orange_heart owl ox oyster page_facing_up page_with_curl palette palm_tree palms_up_together pancakes panda_face parachute party_popper pawn pawprint peach peanuts pear people performing_arts person person2 person_bowing_deeply person_in_lotus_position personal_computer petri_dish pick pig pill pink_heart pistol police_cars_revolving_light poodle postal_horn postbox potato potion potted_plant pouch poultry_leg prayer prayer_beads public_address_loudspeaker purple_heart pushpin puzzle question_red rabbit racing_car racing_motorcycle radio radioactive rainbow raised_back_of_hand raised_fist raised_hand rat recreational_vehicle red_apple red_gift_envelope reminder_ribbon rhinoceros ribbon rice right_pointing_magnifying_gl ring ringed_planet robot rock rocket rolled_up_newspaper rope rose rosette round_pushpin rowboat runner safety_vest sailboat sake_bottle_and_cup salt_shaker satellite sauropod scales scarf scroll seat second_place_medal shallow_pan_of_food shark sheep shell shield ship shooting_star shop shopping_bags shopping_trolley signboard silhouette_of_japan skateboard skull skull_bones sleeping sleeping_accommodation sleuth_or_spy slightly_smiling_face small_airplane smiling_face_with_horns smiling_face_with_smiling_ey snail snake snow snow_mtn soon_with_rightwards_arrow_a sparkle speaker speaker_with_cancellation_st speaker_with_three_sound_wav speech speedboat spider spider_web spiral_calendar_pad splashing_sweat sprout square_four_corners squid staff_of_aesculapius standing_person star statue steam_locomotive stethoscope stew straight_ruler studio_microphone sun_with_face sunflower sunrise sunrise_over_mountains sunset_over_buildings swimmer swords t_rex t_shirt tanabata_tree tangerine target teacup_without_handle telescope television tengu tent thermometer third_place_medal thought thread three_button_mouse thunder_cloud_and_rain ticket tiger tiger_face tomato toolbox tooth top_hat torii tower train tree triangular_ruler trident_emblem trophy truck tulip turtle ufo up_pointing_red_triangle vase vertical_traffic_light video_game village violin volcano wave waving_hand weight_lifter whale wheat wheel wheel_of_dharma whirl white_heart white_heart_suit white_large_square white_star white_sun_behind_cloud_with_ wilted_flower wind wind_blowing_face wind_chime wine_glass wing wizard_hat wolf_face womans_boots wood worm wrench writing_hand x_ray yellow_heart yinyang zebra_face zombie',
    realm: 'abacus adhesive_bandage admission_tickets aerial_tramway airplane airplane_arriving alembic alien_monster ambulance anchor anger atom axe baby baby_bottle baby_chick backpack ball_of_yarn balloon ballot_x bar_chart bar_of_soap basket bat battery bear_face bed bee beetle bell biohazard bird birthday_cake black_feathered_north_east_a black_heart black_large_square black_nib black_rightwards_arrow black_rightwards_arrowhead black_scissors black_sun_with_rays black_universal_recycling blossom blowfish blue_book blueberries boar bolt bone book bookmark books boom bottle_with_popping_cork bow bowl_with_spoon boxing_glove brain bricks bridge_at_night briefcase broken_heart broom bubbles bug building_construction bulb butterfly cactus calendar camel camera camp candle canoe carp_streamer castle cat cat_face chain chains chair chart_with_upwards_trend chequered_flag chestnut chicken child chipmunk circus_tent cityscape climber clipboard closed_book closed_mailbox_with_lowered_ cloud cloud_with_lightning cloud_with_rain cloud_with_snow cloud_with_tornado coat coffin coin comet compass confetti construction control_knobs cooking coral cottage cow crab crate cricket cricket_bat_and_ball cross_mark crossed_flags crown crystal curly_loop dagger dango dark_sunglasses deer department_store derelict_house_building desert desert_island desktop_computer diamond_shape_with_a_dot_ins dish diving_mask dna_double_helix dog dog_face dojo dolphin donkey door dot_black dot_blue dot_brown dot_green dot_orange dot_purple dot_red dot_white dot_yellow dotted_line_face dove down_pointing_small_red_tria dragon dragon_face dromedary_camel drop drop_of_blood drum_with_drumsticks duck eagle earth_globe_asia_australia earth_globe_europe_africa egg electric_plug electric_torch elephant envelope_with_downwards_arro european_castle evergreen_tree exclaim extraterrestrial_alien eye face_with_finger_covering_cl face_without_mouth factory fallen_leaf feather fencer fire_engine fire_extinguisher firecracker firework_sparkler fireworks first_place_medal first_quarter_moon fish fish_trop fishing fisted_hand flag_black flag_in_hole flag_red flag_white flame fleur_de_lis flexed_biceps floppy_disk flower_playing_cards fly fog folding_hand_fan footprints footsteps fountain four_leaf_clover fox_face frame_with_picture frog_face fuel_pump funeral_urn galaxy game_die garlic gear gem gem_blue ghost gift ginger_root glass_of_milk globe_with_meridians gloves glowing_star goal_net goat goggles gradcap grapes grave green_book greens hall hammer hammer_and_pick hammer_and_wrench handshake happy_person_raising_one_han heart heart_green heart_pink hearts_two heavy_large_circle heavy_minus heavy_multiplication_x heavy_plus heavy_round_tipped_rightward hedgehog helmet helmet_with_white_cross herb hibiscus high_brightness hiking_boot hocho hole honey_pot horse horse2 horse_rider house hut hyacinth ice incoming_envelope input_fors japanese_dolls jeans kangaroo kimono kite kneeling_person lab_coat label ladder lady_beetle lantern large_blue_square large_brown_square large_green_square large_orange_diamond large_purple_square large_yellow_square last_quarter_moon leaf_fluttering_in_wind left_speech_bubble leg lemon leopard letter lion_face lizard llama lock lock_with_ink_pen lotus lower_left_fountain_pen lower_left_paintbrush magic_wand magnet magnifier mammoth mantelpiece_clock map maple_leaf meat mechanical_arm mechanical_leg medal medal2 megaphone memo microbe microphone microscope mirror mobile_phone moneybag monkey moon moon_full moon_new mosque mosquito motorway mount_fuji mountain movie_camera mugwort multiple_musical_notes mushroom musical_note musical_score name_badge nazar_amulet newspaper ninja no_entry notebook nut_and_bolt octopus oden office_building old_key older_adult om oni open_mailbox_with_lowered_fl open_mailbox_with_raised_fla orange_heart owl ox oyster page_facing_up page_with_curl palette palm_tree palms_up_together pancakes panda_face parachute party_popper pawn pawprint peach peanuts pear people performing_arts person person2 person_bowing_deeply person_in_lotus_position personal_computer petri_dish pick pig pill pink_heart pistol police_cars_revolving_light poodle postal_horn postbox potato potion potted_plant pouch poultry_leg prayer prayer_beads public_address_loudspeaker purple_heart pushpin puzzle question_red rabbit racing_car racing_motorcycle radio radioactive rainbow raised_back_of_hand raised_fist raised_hand rat recreational_vehicle red_apple red_gift_envelope reminder_ribbon rhinoceros ribbon rice right_pointing_magnifying_gl ring ringed_planet robot rock rocket rolled_up_newspaper rope rose rosette round_pushpin rowboat runner safety_vest sailboat sake_bottle_and_cup salt_shaker satellite sauropod scales scarf scroll seat second_place_medal shallow_pan_of_food shark sheep shell shield ship shooting_star shop shopping_bags shopping_trolley signboard silhouette_of_japan skateboard skull skull_bones sleeping sleeping_accommodation sleuth_or_spy slightly_smiling_face small_airplane smiling_face_with_horns smiling_face_with_smiling_ey snail snake snow snow_mtn soon_with_rightwards_arrow_a sparkle speaker speaker_with_cancellation_st speaker_with_three_sound_wav speech speedboat spider spider_web spiral_calendar_pad splashing_sweat sprout square_four_corners squid staff_of_aesculapius standing_person star statue steam_locomotive stethoscope stew straight_ruler studio_microphone sun_with_face sunflower sunrise sunrise_over_mountains sunset_over_buildings swimmer swords t_rex t_shirt tanabata_tree tangerine target teacup_without_handle telescope television tengu tent thermometer third_place_medal thought thread three_button_mouse thunder_cloud_and_rain ticket tiger tiger_face tomato toolbox tooth top_hat torii tower train tree triangular_ruler trident_emblem trophy truck tulip turtle ufo up_pointing_red_triangle vase vertical_traffic_light video_game village violin volcano wave waving_hand weight_lifter whale wheat wheel wheel_of_dharma whirl white_heart white_heart_suit white_large_square white_star white_sun_behind_cloud_with_ wilted_flower wind wind_blowing_face wind_chime wine_glass wing wizard_hat wolf_face womans_boots wood worm wrench writing_hand x_ray yellow_heart yinyang zebra_face zombie'
  };
/*MAP:end*/
  /* 이 판이 가진 그림만(없는 이름을 읽으려 404 를 내지 않는다) — 판은 주소(/saga-xxx/) 또는 SAGA_UIICON_GAME 으로 안다. 모르면 전부 시험 */
  var GAME = global.SAGA_UIICON_GAME || ((/saga-(go|dungeon|forest|story|realm)/.exec((global.location && global.location.pathname) || '') || [])[1] || '');
  var HAVE = null;
  if (GAME && GAMES[GAME]) { HAVE = {}; GAMES[GAME].split(' ').forEach(function (n) { HAVE[n] = 1; }); }
  var NAMES = {};
  var re = null;
  (function () {
    var k = Object.keys(MAP), i, alt = [];
    k.sort(function (a, b) { return b.length - a.length; });
    for (i = 0; i < k.length; i++) { if (HAVE && !HAVE[MAP[k[i]]]) { delete MAP[k[i]]; continue; } NAMES[MAP[k[i]]] = k[i]; alt.push(k[i]); }
    re = alt.length ? new RegExp('(' + alt.join('|') + ')\uFE0F?', 'g') : /(?!)/g;
  })();

  var state = {};   // 이름 → 'ok' | 'bad' | 'wait'
  var waiting = {}; // 이름 → 기다리는 콜백들

  var imgs = {};    // 이름 → Image (캔버스 그리기용)

  function url(name) { return BASE + name + '_64.png'; }

  function probe(name, cb) {
    if (state[name] === 'ok') { cb(true); return; }
    if (state[name] === 'bad') { cb(false); return; }
    if (state[name] === 'wait') { waiting[name].push(cb); return; }
    state[name] = 'wait'; waiting[name] = [cb];
    var im = new Image();
    imgs[name] = im;
    im.onload = function () { done(true); };
    im.onerror = function () { done(false); };
    function done(ok) {
      state[name] = ok ? 'ok' : 'bad';
      var q = waiting[name]; waiting[name] = null;
      for (var i = 0; i < q.length; i++) q[i](ok);
    }
    im.src = url(name);
  }

  /** 이모지 한 글자(또는 이름)에 대한 아이콘 이름 */
  function nameOf(x) {
    if (NAMES[x]) return x;
    return MAP[String(x).replace(/️/g, '')] || null;
  }

  /** HTML 문자열. 그림이 아직 안 읽혔어도 span 이 글자를 품고 있어 자동 패스가 곧 입힌다 */
  function uiicon(x, px) {
    var n = nameOf(x);
    var ch = n ? NAMES[n] : String(x);
    if (!n || global.SAGA_UIICON_OFF) return ch;
    return '<span class="uiicon" data-ui="' + n + '"' + (px ? ' style="font-size:' + px + 'px"' : '') + '>' + ch + '</span>';
  }

  function paint(span) {
    var n = span.getAttribute('data-ui');
    if (!n || span.getAttribute('data-uiok')) return;
    probe(n, function (ok) {
      if (!ok) return;
      span.style.backgroundImage = 'url("' + url(n) + '")';
      span.setAttribute('data-uiok', '1');
    });
  }

  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1, CANVAS: 1, NOSCRIPT: 1, TITLE: 1 };

  function wrapText(tn) {
    var p = tn.parentNode;
    if (!p || SKIP[p.nodeName]) return;
    if (p.nodeType === 1 && (p.className === 'uiicon' || (p.isContentEditable))) return;
    var s = tn.nodeValue;
    if (!s || s.length > 4000) return;
    re.lastIndex = 0;
    if (!re.test(s)) return;
    re.lastIndex = 0;
    var frag = document.createDocumentFragment(), last = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
      var sp = document.createElement('span');
      sp.className = 'uiicon';
      sp.setAttribute('data-ui', MAP[m[1]]);
      sp.textContent = m[0];
      frag.appendChild(sp);
      paint(sp);
      last = m.index + m[0].length;
    }
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
    p.replaceChild(frag, tn);
  }

  function scan(root) {
    if (!root) return;
    if (root.nodeType === 3) { wrapText(root); return; }
    if (root.nodeType !== 1 || SKIP[root.nodeName]) return;
    if (root.className === 'uiicon') { paint(root); return; }
    var w = document.createTreeWalker(root, 4 /* SHOW_TEXT */, null), list = [], n;
    while ((n = w.nextNode())) { if (n.nodeValue && n.nodeValue.length > 0) list.push(n); }
    for (var i = 0; i < list.length; i++) wrapText(list[i]);
    var pre = root.querySelectorAll ? root.querySelectorAll('.uiicon:not([data-uiok])') : [];
    for (var j = 0; j < pre.length; j++) paint(pre[j]);
  }

  function css() {
    var st = document.createElement('style');
    st.textContent = '.uiicon{display:inline-block;width:1.15em;height:1.15em;vertical-align:-.2em;overflow:hidden;white-space:nowrap;' +
      'text-indent:3em;background:center/contain no-repeat;line-height:1}' +
      '.uiicon:not([data-uiok]){display:inline;width:auto;height:auto;text-indent:0;vertical-align:baseline;overflow:visible}' +
      '.uiicon[data-uiok]{color:transparent}';
    (document.head || document.documentElement).appendChild(st);
  }

  function start() {
    if (global.SAGA_UIICON_OFF) return;
    css();
    scan(document.body);
    var pend = [], sched = false;
    function flush() {
      sched = false;
      var q = pend; pend = [];
      for (var i = 0; i < q.length; i++) { if (q[i].isConnected !== false) scan(q[i]); }
    }
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'characterData') { pend.push(m.target); }
        else for (var j = 0; j < m.addedNodes.length; j++) pend.push(m.addedNodes[j]);
      }
      if (pend.length && !sched) { sched = true; (global.requestAnimationFrame || setTimeout)(flush); }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  /* ── W-0635 캔버스 fillText·strokeText 의 이모지도 그림으로(2D 이름표·떠다니는 글·3D 스프라이트 글자).
     글 폭은 원래 이모지 폭 그대로(measureText 를 안 바꿔 배치가 안 흔들린다) — 그 칸 가운데 그림을 놓는다.
     그림을 아직 못 받았으면 이번엔 옛 글자로 그리고 받기를 건다(다음 프레임부터 그림). 끄기 = SAGA_UIICON_OFF */
  var RE1 = re.source ? new RegExp(re.source) : null;
  var cstat = { icon: 0, wait: 0, text: 0 };   // 검사용: 그림으로 그린 판·받기 전 글자·폭 넘침 글자
  function pxOf(ctx) { var m = /(\d+(?:\.\d+)?)px/.exec(ctx.font || ''); return m ? +m[1] : 10; }
  function split(t) {
    var parts = [], last = 0, m, ready = true;
    re.lastIndex = 0;
    while ((m = re.exec(t))) {
      if (m.index > last) parts.push({ t: t.slice(last, m.index) });
      var n = MAP[m[1]];
      if (state[n] !== 'ok') { ready = false; if (!state[n]) probe(n, function () {}); }
      parts.push({ t: m[0], n: n });
      last = re.lastIndex;
      if (m[0].length === 0) re.lastIndex++;
    }
    if (last < t.length) parts.push({ t: t.slice(last) });
    re.lastIndex = 0;
    return ready ? parts : null;
  }
  function drawRun(ctx, orig, stroke, a) {
    var t = a[0], x = a[1], y = a[2], maxW = a[3];
    var parts = split(t);
    if (!parts) { cstat.wait++; return false; }
    var i, w = 0;
    for (i = 0; i < parts.length; i++) { parts[i].w = ctx.measureText(parts[i].t).width; w += parts[i].w; }
    if (maxW !== undefined && w > maxW) { cstat.text++; return false; }
    var al = ctx.textAlign, dir = ctx.direction === 'rtl';
    var x0 = (al === 'center') ? x - w / 2 : (al === 'right' || (al === 'end' && !dir) || (al === 'start' && dir)) ? x - w : x;
    var px = pxOf(ctx), bl = ctx.textBaseline;
    ctx.textAlign = 'left';
    try {
    for (i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (!p.n) { orig.call(ctx, p.t, x0, y); }
      else if (!stroke) {
        var s = Math.min(px * 1.1, Math.max(p.w, px));
        var top = bl === 'middle' ? y - s / 2 : (bl === 'top' || bl === 'hanging') ? y : (bl === 'bottom' || bl === 'ideographic') ? y - s : y - s * 0.86;
        ctx.drawImage(imgs[p.n], x0 + (p.w - s) / 2, top, s, s);
      }
      x0 += p.w;
    }
    } finally { ctx.textAlign = al; }
    cstat.icon++;
    return true;
  }
  function wrapCanvas(proto) {
    if (!proto || proto.__uiicon || !RE1) return;
    ['fillText', 'strokeText'].forEach(function (k) {
      var orig = proto[k];
      if (typeof orig !== 'function') return;
      var stroke = k === 'strokeText';
      proto[k] = function (t) {
        if (typeof t === 'string' && !global.SAGA_UIICON_OFF && RE1.test(t)) {
          try { if (drawRun(this, orig, stroke, arguments)) return; } catch (e) { /* 그림 실패 = 글자 */ }
        }
        return orig.apply(this, arguments);
      };
    });
    proto.__uiicon = true;
  }
  wrapCanvas(global.CanvasRenderingContext2D && global.CanvasRenderingContext2D.prototype);

  global.uiicon = uiicon;
  global.SAGA = global.SAGA || {};
  global.SAGA.uiicon = { html: uiicon, nameOf: nameOf, map: MAP, scan: scan, canvas: cstat };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(typeof window !== 'undefined' ? window : this);
