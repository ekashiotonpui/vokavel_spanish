import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, Pencil, Trash2, X, ArrowLeftRight,
  RotateCcw, Check, Download, Upload, Layers, Search, Shuffle,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────
   Vokabel — スペイン語 ⇄ 日本語 双方向フラッシュカード
   設計の核：スペイン語名詞の「性」を色で記憶する仕組み
     el（男性） = 青 / la（女性） = 赤
   ────────────────────────────────────────────────────────── */

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

.vk-root {
  --desk: #15161B;
  --desk-2: #1C1E25;
  --paper: #FAF8F2;
  --paper-edge: #ECE7DA;
  --ink: #1A1A20;
  --ink-soft: #5C5C66;
  --line: #2A2C35;
  --el: #3B79B6;
  --la: #BE4763;
  --neutral: #8A8A95;
  font-family: 'Inter', system-ui, sans-serif;
  background: radial-gradient(120% 90% at 50% -10%, #20222B 0%, var(--desk) 55%);
  color: #EDEAE2;
  min-height: 100dvh;
}

.vk-serif { font-family: 'Spectral', Georgia, serif; }
.vk-mono  { font-family: 'JetBrains Mono', monospace; }

.vk-btn { cursor: pointer; border: none; font-family: inherit; transition: transform .12s ease, background .15s ease, border-color .15s ease, opacity .15s; }
.vk-btn:active { transform: scale(.97); }
.vk-btn:focus-visible { outline: 2px solid #7FA8D6; outline-offset: 2px; }

.vk-icon-btn { display: grid; place-items: center; border-radius: 11px; transition: background .15s, color .15s; }
.vk-icon-btn:hover { background: rgba(255,255,255,.07); }

.vk-seg { transition: color .2s; }

.vk-card-shell { perspective: 1600px; }
.vk-card-inner {
  position: relative; width: 100%; height: 100%;
  transform-style: preserve-3d;
  transition: transform .55s cubic-bezier(.2,.8,.25,1);
}
.vk-card-inner.flipped { transform: rotateY(180deg); }
.vk-face {
  position: absolute; inset: 0;
  -webkit-backface-visibility: hidden; backface-visibility: hidden;
  border-radius: 22px; overflow: hidden;
  display: flex; flex-direction: column;
}
.vk-face.back { transform: rotateY(180deg); }

.vk-rate:hover { transform: translateY(-2px); }

.vk-row:hover { background: rgba(255,255,255,.04); }

.vk-input {
  width: 100%; background: #14151A; border: 1px solid #2E313B; color: #EDEAE2;
  border-radius: 12px; padding: 12px 14px; font-size: 15px; font-family: inherit;
  transition: border-color .15s, background .15s;
}
.vk-input:focus { outline: none; border-color: #5E84B3; background: #171922; }
.vk-input::placeholder { color: #595C66; }

@keyframes vk-pop { from { opacity: 0; transform: translateY(10px) scale(.985); } to { opacity: 1; transform: none; } }
.vk-pop { animation: vk-pop .35s cubic-bezier(.2,.8,.25,1) both; }

@keyframes vk-fade { from { opacity: 0 } to { opacity: 1 } }
.vk-fade { animation: vk-fade .3s ease both; }

@media (prefers-reduced-motion: reduce) {
  .vk-card-inner, .vk-pop, .vk-fade { transition: none !important; animation: none !important; }
}
`;

/* ─── 性の色 ─── */
const GENDERS = {
  el: { color: "#3B79B6", label: "masculino" },
  la: { color: "#BE4763", label: "femenino" },
};
const genderColor = (g) => (GENDERS[g] ? GENDERS[g].color : "#8A8A95");

/* ─── 初期データ ─── */
const SEED = [
  ["madre","la","madres","Mi madre cocina muy bien.","母"],
  ["padre","el","padres","Mi padre trabaja en una oficina.","父"],
  ["hijo","el","hijos","Tengo dos hijos.","息子"],
  ["hija","la","hijas","Mi hija estudia en la universidad.","娘"],
  ["hermano","el","hermanos","Mi hermano vive en Madrid.","兄・弟"],
  ["hermana","la","hermanas","Mi hermana es muy simpática.","姉・妹"],
  ["amigo","el","amigos","Voy al cine con mis amigos.","友達（男）"],
  ["amiga","la","amigas","Mi amiga habla español muy bien.","友達（女）"],
  ["señor","el","señores","El señor García es mi profesor.","〜さん（男）"],
  ["señora","la","señoras","La señora López es muy amable.","〜さん（女）"],
  ["casa","la","casas","La casa es grande y hermosa.","家"],
  ["ciudad","la","ciudades","Madrid es una ciudad muy animada.","都市"],
  ["calle","la","calles","La tienda está en esta calle.","通り"],
  ["país","el","países","España es un país muy bonito.","国"],
  ["escuela","la","escuelas","Los niños van a la escuela cada día.","学校"],
  ["universidad","la","universidades","Estudio en la universidad.","大学"],
  ["hospital","el","hospitales","El hospital está cerca de aquí.","病院"],
  ["tienda","la","tiendas","Hay muchas tiendas en el centro.","店"],
  ["restaurante","el","restaurantes","Vamos a comer a ese restaurante.","レストラン"],
  ["hotel","el","hoteles","El hotel está muy bien situado.","ホテル"],
  ["aeropuerto","el","aeropuertos","El aeropuerto está lejos del centro.","空港"],
  ["estación","la","estaciones","La estación de tren está por allí.","駅"],
  ["mercado","el","mercados","Voy al mercado a comprar frutas.","市場"],
  ["banco","el","bancos","Necesito ir al banco esta tarde.","銀行"],
  ["oficina","la","oficinas","Trabajo en una oficina en el centro.","オフィス"],
  ["libro","el","libros","Leo un libro interesante cada día.","本"],
  ["mesa","la","mesas","El libro está sobre la mesa.","テーブル"],
  ["silla","la","sillas","Por favor, siéntate en esta silla.","椅子"],
  ["agua","la","aguas","Bebo agua todos los días.","水"],
  ["comida","la","comidas","La comida española es deliciosa.","食べ物"],
  ["café","el","cafés","Me gusta tomar café por la mañana.","コーヒー"],
  ["pan","el","panes","Compro pan fresco cada mañana.","パン"],
  ["vino","el","vinos","Este vino tinto es excelente.","ワイン"],
  ["carne","la","carnes","No como mucha carne roja.","肉"],
  ["fruta","la","frutas","Como fruta fresca todos los días.","果物"],
  ["ropa","la","ropas","Necesito comprar ropa nueva.","服"],
  ["dinero","el","—","No tengo mucho dinero este mes.","お金"],
  ["trabajo","el","trabajos","Busco trabajo en esta ciudad.","仕事"],
  ["carta","la","cartas","Te escribo una carta desde España.","手紙"],
  ["teléfono","el","teléfonos","¿Me das tu número de teléfono?","電話"],
  ["periódico","el","periódicos","Leo el periódico cada mañana.","新聞"],
  ["tiempo","el","tiempos","Hoy no tengo mucho tiempo.","時間・天気"],
  ["día","el","días","Hoy es un día muy bonito.","日"],
  ["noche","la","noches","Buenas noches, hasta mañana.","夜"],
  ["año","el","años","Este año voy a aprender español.","年"],
  ["semana","la","semanas","La próxima semana tengo vacaciones.","週"],
  ["mes","el","meses","El mes que viene voy a España.","月"],
  ["hora","la","horas","¿Qué hora es ahora?","時間（時刻）"],
  ["sol","el","soles","El sol brilla mucho hoy.","太陽"],
  ["lluvia","la","lluvias","Mañana habrá mucha lluvia.","雨"],
  ["mar","el","mares","Me encanta nadar en el mar.","海"],
  ["montaña","la","montañas","Vamos a subir la montaña este fin de semana.","山"],
  ["hablar","","—","Me gusta hablar con mis amigos.","話す"],
  ["comer","","—","Comemos juntos a las dos.","食べる"],
  ["beber","","—","¿Qué quieres beber?","飲む"],
  ["vivir","","—","Vivo en Tokio desde hace diez años.","住む"],
  ["trabajar","","—","Trabajo en una empresa japonesa.","働く"],
  ["estudiar","","—","Estudio español todos los días.","勉強する"],
  ["aprender","","—","Quiero aprender a cocinar.","学ぶ"],
  ["escribir","","—","Escribo un correo a mi amigo.","書く"],
  ["leer","","—","Me gusta leer novelas en español.","読む"],
  ["escuchar","","—","Escucho música mientras estudio.","聞く"],
  ["ver","","—","Veo la televisión por la noche.","見る"],
  ["comprar","","—","Voy a comprar un regalo para mi madre.","買う"],
  ["vender","","—","Esta tienda vende ropa muy barata.","売る"],
  ["llegar","","—","El tren llega a las tres.","到着する"],
  ["salir","","—","Salgo de casa a las ocho.","出発する・出る"],
  ["volver","","—","Vuelvo a casa a las seis.","帰る"],
  ["ir","","—","Voy al supermercado ahora.","行く"],
  ["venir","","—","¿A qué hora vienes?","来る"],
  ["tener","","—","Tengo mucho que hacer hoy.","持つ・ある"],
  ["querer","","—","Quiero aprender más español.","欲しい・愛する"],
  ["poder","","—","¿Puedes ayudarme, por favor?","できる"],
  ["saber","","—","No sé dónde está la estación.","知っている"],
  ["conocer","","—","Conozco a mucha gente en Madrid.","知っている（面識）"],
  ["gustar","","—","Me gusta mucho la música española.","好きだ"],
  ["necesitar","","—","Necesito más tiempo para estudiar.","必要だ"],
  ["llamar","","—","Te llamo más tarde, ¿de acuerdo?","呼ぶ・電話する"],
  ["esperar","","—","Te espero delante del cine.","待つ・望む"],
  ["pensar","","—","Pienso que el español es muy útil.","思う・考える"],
  ["creer","","—","Creo que mañana va a llover.","〜と思う"],
  ["buscar","","—","Busco un apartamento cerca de la universidad.","探す"],
  ["encontrar","","—","No puedo encontrar mis llaves.","見つける"],
  ["abrir","","—","¿Puedes abrir la ventana, por favor?","開ける"],
  ["cerrar","","—","Por favor, cierra la puerta.","閉める"],
  ["dar","","—","Te doy mi número de teléfono.","与える"],
  ["poner","","—","Pon la maleta aquí, por favor.","置く"],
  ["hacer","","—","¿Qué haces este fin de semana?","する・作る"],
  ["dormir","","—","Duermo ocho horas cada noche.","眠る"],
  ["levantarse","","—","Me levanto a las siete de la mañana.","起きる"],
  ["sentarse","","—","Siéntate aquí, por favor.","座る"],
  ["bueno","","—","Este restaurante tiene muy buena comida.","良い"],
  ["malo","","—","Hoy tengo un mal día.","悪い"],
  ["grande","","—","Vivo en una ciudad muy grande.","大きい"],
  ["pequeño","","—","Mi apartamento es muy pequeño.","小さい"],
  ["nuevo","","—","Compré un coche nuevo ayer.","新しい"],
  ["viejo","","—","Este edificio es muy viejo.","古い・年老いた"],
  ["bonito","","—","¡Qué bonito es este paisaje!","きれいな"],
  ["fácil","","—","Este ejercicio es muy fácil.","簡単な"],
  ["difícil","","—","El español no es tan difícil.","難しい"],
  ["barato","","—","Esta camisa es muy barata.","安い"],
  ["caro","","—","Este restaurante es demasiado caro.","高い（値段）"],
  ["cerca","","—","La estación está muy cerca de aquí.","近い"],
  ["lejos","","—","Mi casa está lejos del trabajo.","遠い"],
  ["mucho","","—","Tengo mucho trabajo esta semana.","たくさんの"],
  ["poco","","—","Hablo un poco de español.","少しの"],
  ["mismo","","—","Vivimos en la misma ciudad.","同じ"],
  ["todo","","—","Todo está bien, no te preocupes.","すべての"],
  ["otro","","—","¿Tienes otro ejemplo?","別の・もう一つの"],
  ["simpático","","—","Mi profesor es muy simpático.","感じのいい"],
  ["interesante","","—","Esta película es muy interesante.","面白い・興味深い"],
  ["hoy","","—","Hoy hace muy buen tiempo.","今日"],
  ["mañana","","—","Mañana tengo un examen importante.","明日・朝"],
  ["ayer","","—","Ayer fui al cine con mi familia.","昨日"],
  ["ahora","","—","Ahora estoy muy ocupado.","今"],
  ["siempre","","—","Siempre desayuno antes de salir.","いつも"],
  ["nunca","","—","Nunca como carne de cerdo.","決して〜ない"],
  ["también","","—","Yo también quiero ir a España.","〜も"],
  ["muy","","—","Esta sopa está muy rica.","とても"],
  ["aquí","","—","Por favor, ven aquí.","ここに"],
  ["allí","","—","El banco está allí, a la derecha.","あそこに"],
  ["bien","","—","Hablas español muy bien.","よく・元気に"],
  ["mal","","—","Me siento mal hoy.","悪く・具合が悪い"],
  ["ya","","—","Ya he terminado mis deberes.","もう・すでに"],
  ["todavía","","—","Todavía no he comido.","まだ"],
  ["niño","el","niños","El niño juega en el parque.","男の子・子供"],
  ["niña","la","niñas","La niña lee un libro bonito.","女の子"],
  ["bebé","el","bebés","El bebé duerme toda la noche.","赤ちゃん"],
  ["joven","el","jóvenes","Los jóvenes tienen mucha energía.","若者"],
  ["adulto","el","adultos","Los adultos tienen más responsabilidades.","大人"],
  ["anciano","el","ancianos","El anciano camina despacio por el parque.","老人（男）"],
  ["anciana","la","ancianas","La anciana teje en su sillón.","老人（女）"],
  ["abuelo","el","abuelos","Mi abuelo cuenta historias fantásticas.","祖父"],
  ["abuela","la","abuelas","Mi abuela hace los mejores dulces.","祖母"],
  ["tío","el","tíos","Mi tío vive en Barcelona.","おじ"],
  ["tía","la","tías","Mi tía viene a visitarnos la próxima semana.","おば"],
  ["primo","el","primos","Mi primo y yo somos muy amigos.","いとこ（男）"],
  ["prima","la","primas","Mi prima estudia medicina.","いとこ（女）"],
  ["novio","el","novios","Mi novio es muy cariñoso.","彼氏・婚約者"],
  ["novia","la","novias","Mi novia habla tres idiomas.","彼女・婚約者"],
  ["marido","el","maridos","Su marido trabaja en el extranjero.","夫"],
  ["esposa","la","esposas","Su esposa es profesora de español.","妻"],
  ["vecino","el","vecinos","Mi vecino es muy simpático.","隣人（男）"],
  ["vecina","la","vecinas","Mi vecina tiene un perro precioso.","隣人（女）"],
  ["compañero","el","compañeros","Mis compañeros de clase son muy amables.","クラスメート・同僚（男）"],
  ["compañera","la","compañeras","Mi compañera de trabajo me ayuda mucho.","クラスメート・同僚（女）"],
  ["médico","el","médicos","El médico me recetó un medicamento.","医師（男）"],
  ["médica","la","médicas","La médica es muy profesional.","医師（女）"],
  ["profesor","el","profesores","El profesor explica muy bien.","先生（男）"],
  ["profesora","la","profesoras","La profesora corrige los deberes.","先生（女）"],
  ["estudiante","el","estudiantes","El estudiante estudia mucho.","学生"],
  ["alumno","el","alumnos","Los alumnos escuchan con atención.","生徒（男）"],
  ["alumna","la","alumnas","La alumna saca muy buenas notas.","生徒（女）"],
  ["camarero","el","camareros","El camarero nos trae la carta.","ウェイター"],
  ["camarera","la","camareras","La camarera recomienda el plato del día.","ウェイトレス"],
  ["cocinero","el","cocineros","El cocinero prepara la comida con cuidado.","料理人（男）"],
  ["cocinera","la","cocineras","La cocinera hace una paella deliciosa.","料理人（女）"],
  ["policía","el","policías","El policía ayuda a los turistas.","警察官"],
  ["bombero","el","bomberos","El bombero apaga el fuego.","消防士"],
  ["enfermero","el","enfermeros","El enfermero cuida a los pacientes.","看護師（男）"],
  ["enfermera","la","enfermeras","La enfermera es muy amable.","看護師（女）"],
  ["abogado","el","abogados","El abogado defiende a su cliente.","弁護士（男）"],
  ["abogada","la","abogadas","La abogada es muy inteligente.","弁護士（女）"],
  ["arquitecto","el","arquitectos","El arquitecto diseña edificios modernos.","建築家（男）"],
  ["ingeniero","el","ingenieros","El ingeniero trabaja en una empresa tecnológica.","エンジニア（男）"],
  ["periodista","el","periodistas","El periodista escribe para un diario importante.","ジャーナリスト"],
  ["músico","el","músicos","El músico toca el violín muy bien.","音楽家"],
  ["actor","el","actores","El actor trabaja en una película nueva.","俳優"],
  ["actriz","la","actrices","La actriz es muy famosa en España.","女優"],
  ["turista","el","turistas","Hay muchos turistas en Madrid.","観光客"],
  ["persona","la","personas","Hay muchas personas en el metro.","人"],
  ["gente","la","—","La gente en España es muy abierta.","人々"],
  ["equipo","el","equipos","Nuestro equipo ganó el partido.","チーム"],
  ["apartamento","el","apartamentos","Vivo en un apartamento pequeño.","アパート"],
  ["piso","el","pisos","Su piso está en el tercer piso.","フロア・マンション"],
  ["habitación","la","habitaciones","Mi habitación es pequeña pero cómoda.","部屋"],
  ["cocina","la","cocinas","La cocina es mi lugar favorito de la casa.","台所"],
  ["baño","el","baños","El baño está al final del pasillo.","バスルーム"],
  ["dormitorio","el","dormitorios","Mi dormitorio tiene una cama grande.","寝室"],
  ["salón","el","salones","El salón tiene mucha luz natural.","リビング"],
  ["jardín","el","jardines","El jardín está lleno de flores.","庭"],
  ["terraza","la","terrazas","Desayuno en la terraza todos los días.","テラス"],
  ["garaje","el","garajes","El coche está en el garaje.","ガレージ"],
  ["ascensor","el","ascensores","El ascensor no funciona hoy.","エレベーター"],
  ["escalera","la","escaleras","Sube por las escaleras, es mejor.","階段"],
  ["pasillo","el","pasillos","El baño está al final del pasillo.","廊下"],
  ["pueblo","el","pueblos","Vivimos en un pueblo pequeño.","村・町"],
  ["barrio","el","barrios","Me gusta mucho mi barrio.","地区・街区"],
  ["plaza","la","plazas","Nos encontramos en la plaza mayor.","広場"],
  ["puente","el","puentes","El puente sobre el río es muy antiguo.","橋"],
  ["carretera","la","carreteras","La carretera está en muy mal estado.","道路"],
  ["autopista","la","autopistas","Tomamos la autopista para llegar antes.","高速道路"],
  ["semáforo","el","semáforos","Para en el semáforo en rojo.","信号"],
  ["farmacia","la","farmacias","Necesito ir a la farmacia.","薬局"],
  ["supermercado","el","supermercados","Voy al supermercado después del trabajo.","スーパー"],
  ["panadería","la","panaderías","La panadería abre a las siete.","パン屋"],
  ["carnicería","la","carnicerías","Compro la carne en la carnicería.","肉屋"],
  ["librería","la","librerías","Compré un diccionario en la librería.","本屋"],
  ["papelería","la","papelerías","Necesito ir a la papelería.","文房具屋"],
  ["peluquería","la","peluquerías","Me corté el pelo en la peluquería.","美容院・理髪店"],
  ["correos","el","—","Envío el paquete por correos.","郵便局"],
  ["ayuntamiento","el","ayuntamientos","El ayuntamiento está en el centro.","市役所"],
  ["embajada","la","embajadas","La embajada japonesa está en Madrid.","大使館"],
  ["museo","el","museos","El Prado es un museo famoso.","美術館・博物館"],
  ["teatro","el","teatros","Esta noche vamos al teatro.","劇場"],
  ["cine","el","cines","La nueva película está en el cine.","映画館"],
  ["estadio","el","estadios","El estadio tiene capacidad para 80.000 personas.","スタジアム"],
  ["piscina","la","piscinas","En verano voy mucho a la piscina.","プール"],
  ["gimnasio","el","gimnasios","Voy al gimnasio tres veces por semana.","ジム"],
  ["parque","el","parques","Me gusta pasear por el parque.","公園"],
  ["playa","la","playas","La playa está llena de gente en agosto.","ビーチ"],
  ["bosque","el","bosques","Dimos un paseo por el bosque.","森"],
  ["lago","el","lagos","El lago es muy tranquilo en invierno.","湖"],
  ["río","el","ríos","El río Tajo pasa por Toledo.","川"],
  ["isla","la","islas","Las Canarias son unas islas preciosas.","島"],
  ["campo","el","campos","Me gusta vivir en el campo.","田舎・野原"],
  ["valle","el","valles","El pueblo está en un valle verde.","谷"],
  ["costa","la","costas","La costa mediterránea es muy bonita.","海岸"],
  ["leche","la","—","Tomo leche con el desayuno.","牛乳"],
  ["zumo","el","zumos","¿Quieres un zumo de naranja?","ジュース"],
  ["cerveza","la","cervezas","En España se toma mucha cerveza.","ビール"],
  ["agua mineral","la","aguas minerales","Por favor, una agua mineral sin gas.","ミネラルウォーター"],
  ["té","el","tés","Por las tardes tomo un té con leche.","紅茶"],
  ["aceite","el","aceites","El aceite de oliva es muy sano.","油・オリーブオイル"],
  ["sal","la","—","Añade un poco de sal a la sopa.","塩"],
  ["azúcar","el","—","¿Tomas azúcar en el café?","砂糖"],
  ["arroz","el","—","La paella se hace con arroz.","ご飯・米"],
  ["pasta","la","pastas","Me encanta la pasta con tomate.","パスタ"],
  ["sopa","la","sopas","En invierno me gusta tomar sopa caliente.","スープ"],
  ["ensalada","la","ensaladas","Como una ensalada cada día.","サラダ"],
  ["patata","la","patatas","La tortilla española se hace con patatas.","じゃがいも"],
  ["tomate","el","tomates","El gazpacho lleva tomate fresco.","トマト"],
  ["cebolla","la","cebollas","La cebolla me hace llorar.","玉ねぎ"],
  ["ajo","el","ajos","El ajo es muy usado en la cocina española.","にんにく"],
  ["zanahoria","la","zanahorias","La zanahoria es muy nutritiva.","にんじん"],
  ["lechuga","la","lechugas","La ensalada lleva lechuga.","レタス"],
  ["pollo","el","pollos","El pollo al horno está delicioso.","鶏肉"],
  ["ternera","la","—","La ternera a la plancha es mi plato favorito.","牛肉"],
  ["cerdo","el","—","El jamón de cerdo es muy típico.","豚肉"],
  ["jamón","el","jamones","El jamón ibérico es un manjar.","ハム"],
  ["queso","el","quesos","España tiene muchos tipos de queso.","チーズ"],
  ["huevo","el","huevos","Los huevos revueltos son muy fáciles.","卵"],
  ["mantequilla","la","—","Pon mantequilla en el pan.","バター"],
  ["pescado","el","pescados","El pescado fresco es muy sano.","魚"],
  ["marisco","el","mariscos","Me encanta el marisco a la plancha.","シーフード"],
  ["manzana","la","manzanas","Una manzana al día es muy sana.","りんご"],
  ["naranja","la","naranjas","Las naranjas de Valencia son famosas.","オレンジ"],
  ["plátano","el","plátanos","Me como un plátano después de hacer deporte.","バナナ"],
  ["uva","la","uvas","Las uvas son muy dulces en otoño.","ぶどう"],
  ["fresa","la","fresas","Las fresas con nata están deliciosas.","いちご"],
  ["pastel","el","pasteles","Este pastel de chocolate está buenísimo.","ケーキ・パイ"],
  ["tarta","la","tartas","Para el cumpleaños hacemos una tarta.","タルト・ケーキ"],
  ["galleta","la","galletas","Tomo galletas con el té.","クッキー"],
  ["bocadillo","el","bocadillos","Me como un bocadillo de jamón.","サンドイッチ"],
  ["tortilla","la","tortillas","La tortilla española lleva huevo y patata.","オムレツ・トルティーヤ"],
  ["paella","la","paellas","La paella valenciana es muy famosa.","パエリア"],
  ["menú","el","menús","¿Cuál es el menú del día?","メニュー・定食"],
  ["plato","el","platos","El plato del día es arroz con pollo.","皿・料理"],
  ["postre","el","postres","De postre tomamos flan.","デザート"],
  ["desayuno","el","desayunos","El desayuno español es ligero.","朝食"],
  ["almuerzo","el","almuerzos","El almuerzo es a las dos.","昼食"],
  ["cena","la","cenas","La cena en España es tarde.","夕食"],
  ["merienda","la","meriendas","Los niños toman la merienda a las cinco.","おやつ"],
  ["receta","la","recetas","Sigue la receta paso a paso.","レシピ"],
  ["camisa","la","camisas","Lleva una camisa blanca muy elegante.","シャツ"],
  ["camiseta","la","camisetas","En verano uso camisetas de manga corta.","Tシャツ"],
  ["pantalón","el","pantalones","Estos pantalones me quedan perfectos.","ズボン"],
  ["falda","la","faldas","Hoy lleva una falda azul muy bonita.","スカート"],
  ["vestido","el","vestidos","El vestido de noche es muy elegante.","ワンピース・ドレス"],
  ["chaqueta","la","chaquetas","Coge una chaqueta, que hace frío.","ジャケット"],
  ["abrigo","el","abrigos","En invierno siempre llevo abrigo.","コート"],
  ["bufanda","la","bufandas","Me pongo la bufanda cuando hace frío.","マフラー"],
  ["gorro","el","gorros","Lleva un gorro de lana en invierno.","帽子・ニット帽"],
  ["guantes","los","—","Ponte los guantes, hace mucho frío.","手袋"],
  ["zapatos","los","—","Necesito unos zapatos nuevos.","靴"],
  ["zapatillas","las","—","Uso zapatillas deportivas para correr.","スニーカー"],
  ["calcetines","los","—","Cada día cambio de calcetines.","靴下"],
  ["bolso","el","bolsos","Ella lleva un bolso de cuero.","バッグ・ハンドバッグ"],
  ["mochila","la","mochilas","Los estudiantes llevan mochilas al colegio.","リュックサック"],
  ["maleta","la","maletas","Tengo que hacer la maleta para el viaje.","スーツケース"],
  ["gafas","las","—","Sin gafas no veo nada.","眼鏡"],
  ["reloj","el","relojes","Mi reloj se ha parado.","時計"],
  ["anillo","el","anillos","Le regaló un anillo de oro.","指輪"],
  ["paraguas","el","—","Coge el paraguas, que va a llover.","傘"],
  ["cama","la","camas","Me voy a la cama temprano.","ベッド"],
  ["armario","el","armarios","Mi ropa está en el armario.","クローゼット・タンス"],
  ["sofá","el","sofás","Me siento en el sofá a ver la tele.","ソファー"],
  ["lámpara","la","lámparas","La lámpara del salón está rota.","ランプ"],
  ["espejo","el","espejos","Me miro en el espejo cada mañana.","鏡"],
  ["toalla","la","toallas","Dame una toalla limpia, por favor.","タオル"],
  ["jabón","el","jabones","Me lavo las manos con jabón.","石鹸"],
  ["champú","el","champús","Este champú huele muy bien.","シャンプー"],
  ["cepillo","el","cepillos","Me cepillo los dientes dos veces al día.","ブラシ・歯ブラシ"],
  ["pasta de dientes","la","—","Me falta pasta de dientes.","歯磨き粉"],
  ["frigorífico","el","frigoríficos","El frigorífico está lleno de comida.","冷蔵庫"],
  ["horno","el","hornos","El pan está en el horno.","オーブン"],
  ["microondas","el","—","Caliento la comida en el microondas.","電子レンジ"],
  ["lavadora","la","lavadoras","Pongo la lavadora los sábados.","洗濯機"],
  ["aspiradora","la","aspiradoras","Paso la aspiradora una vez a la semana.","掃除機"],
  ["llave","la","llaves","No encuentro mis llaves.","鍵"],
  ["móvil","el","móviles","Me he dejado el móvil en casa.","携帯電話"],
  ["ordenador","el","ordenadores","Trabajo todo el día con el ordenador.","パソコン"],
  ["televisión","la","televisiones","Veo la televisión por la noche.","テレビ"],
  ["radio","la","radios","Por las mañanas escucho la radio.","ラジオ"],
  ["cámara","la","cámaras","Saqué muchas fotos con mi cámara.","カメラ"],
  ["coche","el","coches","Mi coche está en el taller.","車"],
  ["tren","el","trenes","El tren sale a las diez.","電車"],
  ["autobús","el","autobuses","Cojo el autobús para ir al trabajo.","バス"],
  ["metro","el","metros","El metro es muy rápido.","地下鉄"],
  ["tranvía","el","tranvías","El tranvía pasa cada cinco minutos.","路面電車"],
  ["bicicleta","la","bicicletas","Voy al trabajo en bicicleta.","自転車"],
  ["avión","el","aviones","El avión sale a las dos.","飛行機"],
  ["barco","el","barcos","Cruzamos el estrecho en barco.","船"],
  ["taxi","el","taxis","Tomamos un taxi al aeropuerto.","タクシー"],
  ["billete","el","billetes","Compré el billete de tren online.","切符・紙幣"],
  ["pasaporte","el","pasaportes","No olvides el pasaporte.","パスポート"],
  ["equipaje","el","equipajes","Facturo el equipaje en el mostrador.","荷物"],
  ["viaje","el","viajes","El viaje a Japón fue increíble.","旅行"],
  ["vacaciones","las","—","Este verano nos vamos de vacaciones.","休暇"],
  ["turismo","el","—","El turismo es muy importante en España.","観光"],
  ["visita","la","visitas","La visita al museo fue muy interesante.","訪問・見学"],
  ["excursión","la","excursiones","Hicimos una excursión al campo.","遠足・エクスカーション"],
  ["mapa","el","mapas","Busca el hotel en el mapa.","地図"],
  ["dirección","la","direcciones","¿Me das tu dirección?","住所・方向"],
  ["norte","el","—","Bilbao está al norte de España.","北"],
  ["sur","el","—","Granada está al sur de España.","南"],
  ["este","el","—","Barcelona está al este de España.","東"],
  ["oeste","el","—","Portugal está al oeste de España.","西"],
  ["flor","la","flores","Le regalé flores a mi madre.","花"],
  ["árbol","el","árboles","Hay muchos árboles en el parque.","木"],
  ["hierba","la","hierbas","La hierba del jardín está muy alta.","草"],
  ["tierra","la","—","La tierra de este lugar es muy fértil.","土地・大地"],
  ["cielo","la","—","El cielo está despejado hoy.","空"],
  ["luna","la","—","La luna llena ilumina la noche.","月"],
  ["estrella","la","estrellas","El cielo está lleno de estrellas.","星"],
  ["nieve","la","—","Los niños juegan con la nieve.","雪"],
  ["viento","el","vientos","Hoy sopla mucho viento.","風"],
  ["nube","la","nubes","Hay muchas nubes en el cielo.","雲"],
  ["tormenta","la","tormentas","Viene una tormenta esta noche.","嵐"],
  ["temperatura","la","temperaturas","La temperatura ha bajado mucho.","気温・温度"],
  ["gato","el","gatos","El gato duerme en el sofá.","猫"],
  ["perro","el","perros","El perro corre rápido en el parque.","犬"],
  ["pájaro","el","pájaros","El pájaro canta por las mañanas.","鳥"],
  ["caballo","el","caballos","El caballo galopa muy rápido.","馬"],
  ["vaca","la","vacas","La vaca pasta en el prado.","牛"],
  ["pez","el","peces","El pez nada en el agua.","魚"],
  ["mariposa","la","mariposas","La mariposa vuela de flor en flor.","蝶々"],
  ["abeja","la","abejas","La abeja produce miel.","蜂"],
  ["araña","la","arañas","Tengo miedo de las arañas.","クモ"],
  ["serpiente","la","serpientes","En Australia hay muchas serpientes.","蛇"],
  ["León","el","leones","El león es el rey de la sabana.","ライオン"],
  ["tigre","el","tigres","El tigre es un animal muy veloz.","トラ"],
  ["elefante","el","elefantes","Los elefantes son muy inteligentes.","象"],
  ["mono","el","monos","Los monos juegan en el zoo.","猿"],
  ["oso","el","osos","El oso duerme en invierno.","熊"],
  ["lobo","el","lobos","El lobo aúlla a la luna.","狼"],
  ["zorro","el","zorros","El zorro es muy astuto.","キツネ"],
  ["conejo","el","conejos","El conejo come zanahorias.","ウサギ"],
  ["lunes","el","—","El lunes empiezo el trabajo.","月曜日"],
  ["martes","el","—","El martes tengo una reunión.","火曜日"],
  ["miércoles","el","—","El miércoles voy al gimnasio.","水曜日"],
  ["jueves","el","—","El jueves viene mi hermana.","木曜日"],
  ["viernes","el","—","El viernes salimos antes del trabajo.","金曜日"],
  ["sábado","el","—","El sábado duermo hasta tarde.","土曜日"],
  ["domingo","el","—","El domingo es mi día favorito.","日曜日"],
  ["fin de semana","el","fines de semana","¿Qué haces este fin de semana?","週末"],
  ["primavera","la","primaveras","En primavera florecen los campos.","春"],
  ["verano","el","veranos","En verano vamos a la playa.","夏"],
  ["otoño","el","otoños","En otoño las hojas caen de los árboles.","秋"],
  ["invierno","el","inviernos","En invierno hace mucho frío.","冬"],
  ["mediodía","el","—","Comemos al mediodía.","正午"],
  ["tarde","la","tardes","Por la tarde hago deporte.","午後・夕方"],
  ["minuto","el","minutos","Solo necesito cinco minutos.","分"],
  ["segundo","el","segundos","Espera un segundo, por favor.","秒"],
  ["siglo","el","siglos","En el siglo XX hubo grandes cambios.","世紀"],
  ["cuerpo","el","cuerpos","El deporte es bueno para el cuerpo.","体"],
  ["cabeza","la","cabezas","Tengo un dolor de cabeza horrible.","頭"],
  ["pelo","el","pelos","Tiene el pelo largo y rizado.","髪の毛"],
  ["cara","la","caras","Tiene una cara muy simpática.","顔"],
  ["ojo","el","ojos","Tiene los ojos azules muy bonitos.","目"],
  ["nariz","la","narices","Mi nariz lleva días mocosa.","鼻"],
  ["boca","la","bocas","Abre la boca, por favor.","口"],
  ["oreja","la","orejas","Me duele la oreja derecha.","耳"],
  ["diente","el","dientes","Me lavo los dientes dos veces al día.","歯"],
  ["cuello","el","cuellos","Me duele el cuello de trabajar con el ordenador.","首"],
  ["hombro","el","hombros","Tengo el hombro muy cargado.","肩"],
  ["brazo","el","brazos","Se rompió el brazo jugando al fútbol.","腕"],
  ["mano","la","manos","Lávate las manos antes de comer.","手"],
  ["dedo","el","dedos","Me lastimé el dedo con el cuchillo.","指"],
  ["pierna","la","piernas","Después del ejercicio me duelen las piernas.","脚"],
  ["pie","el","pies","Me salieron ampollas en los pies.","足"],
  ["espalda","la","espaldas","Me duele mucho la espalda.","背中"],
  ["corazón","el","corazones","El deporte es bueno para el corazón.","心臓・心"],
  ["estómago","el","estómagos","Me duele el estómago.","胃・お腹"],
  ["salud","la","—","La salud es lo más importante.","健康"],
  ["enfermedad","la","enfermedades","Esta enfermedad es muy contagiosa.","病気"],
  ["dolor","el","dolores","Tengo un dolor muy fuerte de cabeza.","痛み"],
  ["fiebre","la","fiebres","El niño tiene fiebre alta.","熱"],
  ["resfriado","el","resfriados","Tengo un resfriado muy malo.","風邪"],
  ["medicamento","el","medicamentos","El médico me recetó un medicamento.","薬"],
  ["pastilla","la","pastillas","Toma dos pastillas cada ocho horas.","錠剤"],
  ["operación","la","operaciones","La operación salió muy bien.","手術"],
  ["clase","la","clases","La clase de español es muy divertida.","授業・クラス"],
  ["curso","el","cursos","Este año empiezo un curso de cocina.","コース・学年"],
  ["examen","el","exámenes","La semana que viene tengo un examen.","試験"],
  ["nota","la","notas","He sacado muy buenas notas este trimestre.","成績"],
  ["deberes","los","—","Tengo que hacer los deberes.","宿題"],
  ["asignatura","la","asignaturas","Mi asignatura favorita es historia.","科目"],
  ["lengua","la","lenguas","Aprendo una lengua nueva cada año.","言語・国語"],
  ["inglés","el","—","El inglés es muy importante hoy en día.","英語"],
  ["español","el","—","Aprendo español porque me encanta.","スペイン語"],
  ["matemáticas","las","—","Las matemáticas son mi asignatura más difícil.","数学"],
  ["historia","la","—","La historia de España es muy rica.","歴史"],
  ["música","la","—","La música me hace muy feliz.","音楽"],
  ["deporte","el","deportes","El deporte es muy importante para la salud.","スポーツ"],
  ["biblioteca","la","bibliotecas","Voy a la biblioteca a estudiar.","図書館"],
  ["laboratorio","el","laboratorios","Hacemos experimentos en el laboratorio.","研究室・実験室"],
  ["diccionario","el","diccionarios","Busco la palabra en el diccionario.","辞書"],
  ["cuaderno","el","cuadernos","Apunto todo en el cuaderno.","ノート"],
  ["bolígrafo","el","bolígrafos","¿Me prestas tu bolígrafo?","ボールペン"],
  ["lápiz","el","lápices","Escribe con lápiz, así puedes borrar.","鉛筆"],
  ["goma","la","gomas","Necesito una goma para borrar.","消しゴム"],
  ["empresa","la","empresas","Trabajo en una empresa grande.","会社"],
  ["reunión","la","reuniones","Mañana tenemos una reunión importante.","会議"],
  ["contrato","el","contratos","He firmado el contrato hoy.","契約"],
  ["sueldo","el","sueldos","Mi sueldo no es suficiente.","給料"],
  ["jefe","el","jefes","Mi jefe es muy exigente.","上司（男）"],
  ["jefa","la","jefas","Mi jefa es muy justa.","上司（女）"],
  ["ser","","—","Soy japonés y vivo en Tokio.","〜である（性質）"],
  ["estar","","—","¿Dónde estás ahora?","〜にいる・〜の状態"],
  ["haber","","—","Ha llovido mucho esta semana.","〜がある（完了）"],
  ["decir","","—","¿Qué quieres decir con eso?","言う"],
  ["llevar","","—","Llevo tres años aprendiendo español.","持っていく・着る・〜してから"],
  ["dejar","","—","Déjame en paz, por favor.","残す・やめる・置いていく"],
  ["pasar","","—","¿Qué te pasa?","起こる・過ごす・通る"],
  ["seguir","","—","Sigue todo recto.","続ける・従う"],
  ["quedar","","—","¿Quedamos a las siete?","約束する・残る・似合う"],
  ["traer","","—","¿Me traes un vaso de agua?","持ってくる"],
  ["parecer","","—","Parece que va a llover.","〜に見える・〜らしい"],
  ["entrar","","—","Por favor, entra.","入る"],
  ["parar","","—","Para el coche aquí.","止まる・止める"],
  ["cambiar","","—","Quiero cambiar de trabajo.","変える・変わる"],
  ["perder","","—","He perdido las llaves otra vez.","失う・負ける"],
  ["ganar","","—","Ganamos el partido ayer.","勝つ・稼ぐ"],
  ["jugar","","—","Los niños juegan en el jardín.","遊ぶ・（スポーツを）する"],
  ["correr","","—","Corro todos los días por el parque.","走る"],
  ["nadar","","—","Me encanta nadar en el mar.","泳ぐ"],
  ["caminar","","—","Camino media hora cada día.","歩く"],
  ["subir","","—","Subimos las escaleras corriendo.","上る・乗る"],
  ["bajar","","—","Baja del autobús en la próxima parada.","下りる・降ろす"],
  ["entender","","—","No entiendo lo que dices.","理解する"],
  ["recordar","","—","¿Recuerdas su nombre?","覚えている・思い出す"],
  ["olvidar","","—","Siempre olvido las llaves.","忘れる"],
  ["pagar","","—","¿Puedo pagar con tarjeta?","払う"],
  ["preguntar","","—","Pregúntale a ella.","質問する"],
  ["contestar","","—","Contesta el teléfono, por favor.","答える"],
  ["ayudar","","—","¿Puedes ayudarme?","助ける・手伝う"],
  ["invitar","","—","Te invito a cenar esta noche.","招待する"],
  ["reservar","","—","He reservado una mesa para dos.","予約する"],
  ["viajar","","—","Me encanta viajar por el mundo.","旅行する"],
  ["visitar","","—","Visité el Museo del Prado.","訪問する"],
  ["preparar","","—","Preparo la cena cada noche.","準備する"],
  ["limpiar","","—","Limpio la casa los sábados.","掃除する"],
  ["cocinar","","—","Mi madre cocina muy bien.","料理する"],
  ["ducharse","","—","Me ducho por las mañanas.","シャワーを浴びる"],
  ["despertarse","","—","Me despierto a las siete.","目覚める"],
  ["acostarse","","—","Me acuesto a las once.","横になる・就寝する"],
  ["vestirse","","—","Me visto rápido por las mañanas.","着替える"],
  ["probarse","","—","¿Puedo probarme este vestido?","試着する"],
  ["empezar","","—","La clase empieza a las nueve.","始まる・始める"],
  ["terminar","","—","¿A qué hora terminas el trabajo?","終わる・終える"],
  ["continuar","","—","Continúa con tu trabajo.","続ける"],
  ["repetir","","—","Por favor, repite más despacio.","繰り返す"],
  ["explicar","","—","¿Puedes explicarme esto?","説明する"],
  ["enseñar","","—","Mi profesora enseña muy bien.","教える"],
  ["mostrar","","—","Muéstrame cómo se hace.","見せる"],
  ["mandar","","—","Te mando el correo ahora mismo.","送る・命令する"],
  ["recibir","","—","He recibido tu mensaje.","受け取る"],
  ["aburrirse","","—","Me aburro mucho los domingos.","退屈する"],
  ["divertirse","","—","Nos divertimos mucho en la fiesta.","楽しむ"],
  ["preocuparse","","—","No te preocupes, todo irá bien.","心配する"],
  ["alegrarse","","—","Me alegro de verte.","喜ぶ"],
  ["enfadarse","","—","Se enfadó mucho con lo que dije.","怒る"],
  ["sentir","","—","Lo siento mucho.","感じる・申し訳なく思う"],
  ["resultar","","—","Resultó ser un gran viaje.","結果的に〜になる"],
  ["funcionar","","—","El ascensor no funciona.","機能する・動く"],
  ["costar","","—","¿Cuánto cuesta?","値段がする・かかる"],
  ["durar","","—","La película dura dos horas.","続く・持続する"],
  ["tardar","","—","El autobús tarda mucho.","時間がかかる"],
  ["alto","","—","Mi hermano es muy alto.","高い・背が高い"],
  ["bajo","","—","Ella es bastante baja.","低い・背が低い"],
  ["gordo","","—","El gato está muy gordo.","太った"],
  ["delgado","","—","Está muy delgada desde que hace deporte.","細い・痩せた"],
  ["guapo","","—","Es un chico muy guapo.","かっこいい・美しい"],
  ["feo","","—","El edificio es bastante feo.","醜い・不細工な"],
  ["mayor","","—","Soy la mayor de tres hermanos.","年上の・大きい（比較）"],
  ["menor","","—","Mi hermano menor tiene diez años.","年下の・小さい（比較）"],
  ["largo","","—","Tiene el pelo muy largo.","長い"],
  ["corto","","—","Lleva el pelo corto.","短い"],
  ["ancho","","—","Esta calle es muy ancha.","広い・幅が広い"],
  ["estrecho","","—","El pasillo es muy estrecho.","狭い・細い"],
  ["pesado","","—","Esta maleta está muy pesada.","重い・くどい"],
  ["ligero","","—","La mochila es muy ligera.","軽い"],
  ["rápido","","—","El tren es muy rápido.","速い"],
  ["lento","","—","El servicio aquí es muy lento.","遅い・のろい"],
  ["caliente","","—","El café está muy caliente.","熱い・温かい"],
  ["frío","","—","El agua está muy fría.","冷たい・寒い"],
  ["rico","","—","Esta paella está muy rica.","おいしい・豊かな"],
  ["sano","","—","La fruta es muy sana.","健康的な"],
  ["enfermo","","—","Estoy enfermo y no puedo salir.","病気の"],
  ["cansado","","—","Estoy muy cansado después del trabajo.","疲れた"],
  ["contento","","—","Estoy muy contento con los resultados.","満足した・嬉しい"],
  ["triste","","—","Está muy triste desde que se fue.","悲しい"],
  ["emocionado","","—","Estoy muy emocionado por el viaje.","興奮した"],
  ["nervioso","","—","Estoy nervioso antes del examen.","緊張した"],
  ["tranquilo","","—","Estás muy tranquilo antes del examen.","落ち着いた・静かな"],
  ["seguro","","—","Estoy seguro de que vendrá.","確かな・安全な"],
  ["libre","","—","¿Estás libre esta tarde?","暇な・自由な"],
  ["ocupado","","—","Estoy muy ocupado esta semana.","忙しい"],
  ["abierto","","—","La tienda está abierta.","開いている"],
  ["cerrado","","—","El museo está cerrado hoy.","閉まっている"],
  ["lleno","","—","El autobús está lleno.","いっぱいの"],
  ["vacío","","—","El vaso está vacío.","空の"],
  ["limpio","","—","El hotel es muy limpio.","清潔な・きれいな"],
  ["sucio","","—","Las manos están sucias.","汚い"],
  ["roto","","—","El móvil está roto.","壊れた"],
  ["listo","","—","¿Estás listo para salir?","準備ができた・賢い"],
  ["solo","","—","Vivo solo en un apartamento.","一人の・ただ〜だけ"],
  ["juntos","","—","Comemos siempre juntos.","一緒に"],
  ["despacio","","—","Habla más despacio, por favor.","ゆっくり"],
  ["deprisa","","—","Caminamos muy deprisa.","速く・急いで"],
  ["bastante","","—","Hablas bastante bien el español.","かなり・十分に"],
  ["demasiado","","—","Comes demasiado deprisa.","〜すぎる"],
  ["quizás","","—","Quizás venga mañana.","たぶん・もしかすると"],
  ["tal vez","","—","Tal vez tenga razón.","たぶん・もしかすると"],
  ["casi","","—","Ya casi hemos terminado.","ほとんど・もうすぐ"],
  ["además","","—","Es barato y además muy bueno.","さらに・その上"],
  ["sin embargo","","—","Es difícil; sin embargo, lo intentaré.","しかし・それでも"],
  ["por eso","","—","Estudio mucho, por eso saco buenas notas.","だから・そのため"],
  ["entonces","","—","Entonces, ¿qué quieres hacer?","それでは・そのとき"],
  ["antes","","—","Llega siempre antes que yo.","前に・以前に"],
  ["después","","—","Te llamo después de comer.","後で・その後"],
  ["pronto","","—","Llegaré pronto.","すぐに・早く"],
  ["temprano","","—","Me levanto muy temprano.","早く・早い"],
  ["dentro","","—","El gato está dentro de la casa.","中に"],
  ["fuera","","—","Los niños juegan fuera.","外に・外側"],
  ["arriba","","—","El piso de arriba hace mucho ruido.","上に・上の"],
  ["abajo","","—","El garaje está abajo.","下に・下の"],
  ["delante","","—","Nos encontramos delante del cine.","前に"],
  ["detrás","","—","El baño está detrás del salón.","後ろに"],
  ["encima","","—","El libro está encima de la mesa.","〜の上に"],
  ["debajo","","—","El gato está debajo de la cama.","〜の下に"],
  ["enfrente","","—","La farmacia está enfrente.","向かいに"],
  ["al lado","","—","Mi casa está al lado del parque.","隣に"],
  ["amor","el","amores","El amor es lo más importante en la vida.","愛"],
  ["amistad","la","amistades","La amistad es muy valiosa.","友情"],
  ["felicidad","la","—","La felicidad está en las pequeñas cosas.","幸福"],
  ["tristeza","la","—","La tristeza pasará pronto.","悲しみ"],
  ["alegría","la","alegrías","¡Qué alegría verte!","喜び"],
  ["miedo","el","miedos","Tengo mucho miedo a la oscuridad.","恐怖・恐れ"],
  ["esperanza","la","esperanzas","Tengo esperanza de que todo saldrá bien.","希望"],
  ["sueño","el","sueños","Mi sueño es vivir en España.","夢・眠り"],
  ["ilusión","la","ilusiones","Tengo mucha ilusión por el viaje.","期待・幻想"],
  ["emoción","la","emociones","Las emociones son parte de la vida.","感情"],
  ["recuerdo","el","recuerdos","Guardo muy buenos recuerdos de España.","思い出・お土産"],
  ["opinión","la","opiniones","¿Cuál es tu opinión sobre esto?","意見"],
  ["idea","la","ideas","Es una idea muy buena.","アイデア・考え"],
  ["problema","el","problemas","Tenemos un problema.","問題"],
  ["solución","la","soluciones","Hay que encontrar una solución.","解決"],
  ["pregunta","la","preguntas","Tengo una pregunta para ti.","質問"],
  ["respuesta","la","respuestas","La respuesta es muy difícil.","答え"],
  ["error","el","errores","Todo el mundo comete errores.","間違い"],
  ["éxito","el","éxitos","¡Mucho éxito en tu examen!","成功"],
  ["fracaso","el","fracasos","El fracaso es parte del aprendizaje.","失敗"],
  ["suerte","la","—","¡Buena suerte!","幸運"],
  ["oportunidad","la","oportunidades","Es una gran oportunidad.","機会"],
  ["peligro","el","peligros","¡Cuidado, hay peligro!","危険"],
  ["seguridad","la","—","La seguridad es lo primero.","安全"],
  ["libertad","la","—","La libertad es un derecho fundamental.","自由"],
  ["paz","la","paces","Queremos vivir en paz.","平和"],
  ["guerra","la","guerras","La guerra causa mucho sufrimiento.","戦争"],
  ["cultura","la","culturas","España tiene una cultura muy rica.","文化"],
  ["tradición","la","tradiciones","El flamenco es una tradición española.","伝統"],
  ["costumbre","la","costumbres","Es una costumbre muy antigua.","習慣"],
  ["diferencia","la","diferencias","¿Cuál es la diferencia?","違い"],
  ["semejanza","la","semejanzas","Hay muchas semejanzas entre los dos.","類似点"],
  ["ventaja","la","ventajas","¿Cuáles son las ventajas?","メリット"],
  ["desventaja","la","desventajas","También hay desventajas.","デメリット"],
  ["importancia","la","—","La educación tiene mucha importancia.","重要性"],
  ["calidad","la","calidades","La calidad de este producto es excelente.","品質"],
  ["cantidad","la","cantidades","¿Qué cantidad necesitas?","量"],
  ["precio","el","precios","El precio es muy razonable.","値段"],
  ["valor","el","valores","El valor de la amistad es incalculable.","価値"],
  ["nivel","el","niveles","Mi nivel de español es B1.","レベル"],
  ["tipo","el","tipos","¿Qué tipo de música te gusta?","タイプ・種類"],
  ["manera","la","maneras","¿De qué manera puedo ayudarte?","方法・やり方"],
  ["forma","la","formas","¿De qué forma lo hacemos?","形・方法"],
  ["parte","la","partes","Esta es la parte más difícil.","部分"],
  ["lugar","el","lugares","Este es mi lugar favorito.","場所"],
  ["momento","el","momentos","Este es el mejor momento.","瞬間・時"],
  ["vez","la","veces","Lo he visto muchas veces.","回・度"],
  ["caso","el","casos","En este caso, es mejor esperar.","場合・ケース"],
  ["ejemplo","el","ejemplos","¿Puedes darme un ejemplo?","例"],
  ["razón","la","razones","Tienes razón.","理由・正しさ"],
  ["noticia","la","noticias","Vi las noticias esta mañana.","ニュース"],
  ["artículo","el","artículos","Leí un artículo muy interesante.","記事"],
  ["revista","la","revistas","Compro una revista de moda.","雑誌"],
  ["novela","la","novelas","Estoy leyendo una novela española.","小説"],
  ["película","la","películas","Esta película me encantó.","映画"],
  ["serie","la","series","Estoy viendo una serie muy buena.","テレビシリーズ"],
  ["programa","el","programas","El programa empieza a las ocho.","番組・プログラム"],
  ["canal","el","canales","¿En qué canal ponen el partido?","チャンネル"],
  ["internet","el","—","Sin internet no puedo trabajar.","インターネット"],
  ["correo electrónico","el","correos electrónicos","Te mando un correo electrónico.","メール"],
  ["mensaje","el","mensajes","Te he mandado un mensaje.","メッセージ"],
  ["red social","la","redes sociales","Uso las redes sociales cada día.","SNS"],
  ["foto","la","fotos","Saqué muchas fotos en el viaje.","写真"],
  ["vídeo","el","vídeos","Subí el vídeo a internet.","動画"],
  ["canción","la","canciones","Esta canción me encanta.","歌"],
  ["concierto","el","conciertos","Fuimos a un concierto de flamenco.","コンサート"],
  ["exposición","la","exposiciones","La exposición en el museo es muy interesante.","展覧会"],
  ["espectáculo","el","espectáculos","El espectáculo fue increíble.","ショー・公演"],
  ["entrada","la","entradas","Compré las entradas por internet.","チケット・入場券"],
  ["publicidad","la","—","Hay demasiada publicidad en la televisión.","広告"],
  ["anuncio","el","anuncios","Vi un anuncio muy gracioso.","広告・お知らせ"],
  ["sociedad","la","sociedades","Vivimos en una sociedad muy diversa.","社会"],
  ["política","la","—","No me interesa mucho la política.","政治"],
  ["economía","la","economías","La economía española ha mejorado.","経済"],
  ["gobierno","el","gobiernos","El gobierno ha tomado medidas.","政府"],
  ["ley","la","leyes","Hay que respetar las leyes.","法律"],
  ["derecho","el","derechos","Todos tenemos derechos iguales.","権利・法律"],
  ["impuesto","el","impuestos","Los impuestos son muy altos.","税金"],
  ["cuenta","la","cuentas","¿Me trae la cuenta, por favor?","勘定・口座"],
  ["factura","la","facturas","Me llegó la factura del gas.","請求書・領収書"],
  ["tarjeta de crédito","la","tarjetas de crédito","¿Puedo pagar con tarjeta de crédito?","クレジットカード"],
  ["cajero automático","el","cajeros automáticos","Necesito sacar dinero del cajero.","ATM"],
  ["descuento","el","descuentos","Hay un descuento del 20%.","割引"],
  ["oferta","la","ofertas","Esta oferta es muy buena.","セール・提案"],
  ["regalo","el","regalos","Le compré un regalo bonito.","プレゼント"],
  ["tiquet","el","tiquets","Guarda el tiquet de compra.","レシート"],
  ["ahorro","el","ahorros","Tengo ahorros para las vacaciones.","貯蓄・節約"],
  ["deuda","la","deudas","Tengo muchas deudas.","借金"],
  ["pensión","la","pensiones","Mi padre cobra la pensión.","年金"],
  ["acabar","","—","Acabo de llegar a casa.","〜し終える・〜したばかり"],
  ["conseguir","","—","No consigo entender esto.","得る・達成する"],
  ["intentar","","—","Intenta hacerlo otra vez.","試みる"],
  ["lograr","","—","Logré aprender español en dos años.","達成する・成し遂げる"],
  ["importar","","—","No me importa lo que digan.","重要である・気にする"],
  ["molestar","","—","¿Te molesta si abro la ventana?","迷惑をかける・気になる"],
  ["doler","","—","Me duele mucho la cabeza.","痛む"],
  ["faltar","","—","Me falta dinero para pagarlo.","足りない・欠ける"],
  ["sobrar","","—","Me sobra tiempo esta tarde.","余る・余分にある"],
  ["pertenecer","","—","Este libro pertenece a mi hermana.","〜に属する"],
  ["depender","","—","Depende del tiempo que haga.","依存する・次第である"],
  ["existir","","—","¿Existe una solución mejor?","存在する"],
  ["aparecer","","—","Apareció de repente.","現れる"],
  ["desaparecer","","—","El dolor ha desaparecido.","消える"],
  ["crecer","","—","Los niños crecen muy rápido.","成長する"],
  ["mejorar","","—","Mi español ha mejorado mucho.","改善する・よくなる"],
  ["empeorar","","—","El tiempo ha empeorado.","悪化する"],
  ["aumentar","","—","Los precios han aumentado.","増える・上がる"],
  ["disminuir","","—","El dolor ha disminuido.","減る・下がる"],
  ["comenzar","","—","La clase comienza a las nueve.","始まる・始める"],
  ["ocurrir","","—","¿Qué ha ocurrido?","起こる"],
  ["suceder","","—","¿Qué ha sucedido aquí?","起こる・継ぐ"],
  ["convertirse","","—","Se ha convertido en un buen pianista.","〜になる・変わる"],
  ["volverse","","—","Se ha vuelto muy serio.","〜になる（状態変化）"],
  ["ponerse","","—","Se ha puesto muy nervioso.","〜になる・着る"],
  ["quedarse","","—","Me quedé sin palabras.","〜のままでいる・残る"],
  ["acordarse","","—","¿Te acuerdas de él?","覚えている・思い出す"],
  ["quejarse","","—","Siempre se queja de todo.","文句を言う"],
  ["equivocarse","","—","Me he equivocado de tren.","間違える"],
  ["perderse","","—","Me he perdido en el centro.","迷子になる・見逃す"],
  ["cuidar","","—","Cuida bien a los niños.","世話をする・気をつける"],
  ["proteger","","—","Hay que proteger el medio ambiente.","守る・保護する"],
  ["respetar","","—","Hay que respetar las normas.","尊重する・守る"],
  ["compartir","","—","Compartimos el apartamento.","共有する・シェアする"],
  ["discutir","","—","Discutimos sobre política.","議論する・言い争う"],
  ["negociar","","—","Tenemos que negociar el precio.","交渉する"],
  ["decidir","","—","He decidido quedarme aquí.","決める"],
  ["elegir","","—","Elige el que más te guste.","選ぶ"],
  ["preferir","","—","Prefiero el café al té.","〜の方が好きだ"],
  ["rechazar","","—","Rechacé la oferta.","断る・拒否する"],
  ["aceptar","","—","Acepto tu invitación con mucho gusto.","受け入れる"],
  ["agradecer","","—","Te agradezco mucho tu ayuda.","感謝する"],
  ["pedir perdón","","—","Le pedí perdón por mi error.","謝る"],
  ["felicitar","","—","Te felicito por tu éxito.","祝う・おめでとう"],
  ["saludar","","—","Saluda a tu familia de mi parte.","挨拶する"],
  ["despedirse","","—","Me despedí de todos antes de irme.","別れを告げる"],
  ["presentarse","","—","Me presenté a mis nuevos compañeros.","自己紹介する"],
  ["atreverse","","—","No me atrevo a hablar en público.","思い切って〜する"],
  ["atender","","—","El médico me atenderá enseguida.","対応する・診る"],
  ["caber","","—","No me cabe más comida.","入る・収まる"],
  ["caer","","—","Se cayó por las escaleras.","落ちる・倒れる"],
  ["colgar","","—","Colgué el cuadro en la pared.","掛ける・（電話を）切る"],
  ["cruzar","","—","Cruza la calle con cuidado.","渡る・横切る"],
  ["doblar","","—","Dobla a la derecha en el semáforo.","曲がる・折る"],
  ["echar","","—","Echa sal a la comida.","入れる・加える・投げる"],
  ["encender","","—","Enciende la luz, por favor.","つける・点火する"],
  ["apagar","","—","Apaga el ordenador al salir.","消す・切る"],
  ["guardar","","—","Guarda el dinero en el bolso.","しまう・保管する"],
  ["meter","","—","Mete la ropa en la lavadora.","入れる"],
  ["sacar","","—","Saca dinero del cajero.","取り出す・出す"],
  ["tirar","","—","Tira la basura en el cubo.","捨てる・投げる"],
  ["tocar","","—","No toques eso.","触れる・演奏する"],
  ["romper","","—","He roto el vaso sin querer.","壊す・破る"],
  ["medir","","—","¿Cuánto mides?","測る・身長がある"],
  ["pesar","","—","¿Cuánto pesas?","重さを量る・体重がある"],
  ["señalar","","—","Señala en el mapa dónde estás.","指さす・示す"],
  ["traducir","","—","¿Puedes traducir esto al japonés?","翻訳する"],
  ["japonés","","—","La cocina japonesa es muy sana.","日本の"],
  ["europeo","","—","Tiene un estilo muy europeo.","ヨーロッパの"],
  ["internacional","","—","Es una empresa internacional.","国際的な"],
  ["moderno","","—","El diseño es muy moderno.","現代的な・モダンな"],
  ["antiguo","","—","Este edificio es muy antiguo.","古い・昔の"],
  ["histórico","","—","Este lugar es muy histórico.","歴史的な"],
  ["famoso","","—","Es un cantante muy famoso.","有名な"],
  ["popular","","—","Este plato es muy popular.","人気のある"],
  ["típico","","—","Es un plato muy típico de España.","典型的な・代表的な"],
  ["especial","","—","Hoy es un día muy especial.","特別な"],
  ["diferente","","—","Son muy diferentes entre sí.","異なる・違う"],
  ["igual","","—","Son exactamente iguales.","同じ・等しい"],
  ["mejor","","—","Esta es la mejor paella que he comido.","より良い・最良の"],
  ["peor","","—","Hoy el tiempo está peor que ayer.","より悪い・最悪の"],
  ["siguiente","","—","El siguiente autobús sale en diez minutos.","次の"],
  ["último","","—","Esta es mi última oportunidad.","最後の"],
  ["primero","","—","Fui el primero en llegar.","最初の"],
  ["próximo","","—","El próximo tren sale a las tres.","次の・近い"],
  ["pasado","","—","El año pasado fui a España.","過去の・先〜"],
  ["presente","","—","Vive en el momento presente.","現在の・プレゼント"],
  ["futuro","","—","Tengo planes para el futuro.","未来の"],
  ["posible","","—","¿Es posible cambiar la reserva?","可能な"],
  ["imposible","","—","Es imposible hacerlo solo.","不可能な"],
  ["necesario","","—","Es necesario estudiar más.","必要な"],
  ["suficiente","","—","Con eso es suficiente.","十分な"],
  ["correcto","","—","Tu respuesta es correcta.","正しい"],
  ["incorrecto","","—","Esta respuesta es incorrecta.","正しくない・間違った"],
  ["verdadero","","—","Eso no es verdad.","本当の・真の"],
  ["falso","","—","Esa información es falsa.","偽の・間違った"],
  ["natural","","—","Es una reacción natural.","自然な"],
  ["normal","","—","Es algo completamente normal.","普通の・正常な"],
  ["extraño","","—","Qué cosa más extraña.","変な・奇妙な"],
  ["raro","","—","Es un caso muy raro.","珍しい・変な"],
  ["común","","—","Es un error muy común.","一般的な・よくある"],
  ["personal","","—","Es un asunto personal.","個人的な"],
  ["público","","—","Estamos en un lugar público.","公の・公共の"],
  ["privado","","—","Esta playa es privada.","私的な・プライベートな"],
  ["oficial","","—","Hay una nota oficial.","公式の"],
  ["principal","","—","Esta es la idea principal.","主な・主要な"],
  ["general","","—","En general, todo fue bien.","一般的な・全般的な"],
  ["total","","—","El coste total es de cien euros.","合計の・全体の"],
  ["completo","","—","El hotel está completo.","完全な・完成した・満室の"],
  ["verdad","la","verdades","Dime la verdad.","真実"],
  ["mentira","la","mentiras","Eso es una mentira.","嘘"],
  ["realidad","la","realidades","La realidad es muy diferente.","現実"],
  ["mundo","el","mundos","El mundo es muy grande.","世界"],
  ["vida","la","vidas","La vida es bella.","人生・生活・命"],
  ["muerte","la","muertes","La muerte es parte de la vida.","死"],
  ["nacimiento","el","nacimientos","El nacimiento de un bebé es especial.","誕生・出生"],
  ["infancia","la","—","Tengo buenos recuerdos de mi infancia.","幼少期・子供時代"],
  ["juventud","la","—","La juventud es una etapa maravillosa.","青春・若さ"],
  ["vejez","la","—","La vejez tiene su encanto.","老い・老齢"],
  ["principio","el","principios","Al principio fue difícil.","始まり・原則"],
  ["final","el","finales","El final de la película me sorprendió.","終わり・結末"],
  ["medio","el","medios","Los medios de comunicación son muy influyentes.","手段・メディア・中間"],
  ["resultado","el","resultados","Los resultados del examen son buenos.","結果"],
  ["objetivo","el","objetivos","Mi objetivo es hablar español con fluidez.","目標"],
  ["plan","el","planes","¿Tienes planes para el fin de semana?","計画"],
  ["proyecto","el","proyectos","Estoy trabajando en un proyecto nuevo.","プロジェクト"],
  ["paso","el","pasos","Da un paso a la vez.","一歩・ステップ"],
  ["esfuerzo","el","esfuerzos","Hay que hacer un gran esfuerzo.","努力"],
  ["logro","el","logros","Este es un gran logro.","達成・成果"],
  ["habilidad","la","habilidades","Tiene muchas habilidades.","能力・スキル"],
  ["talento","el","talentos","Tiene mucho talento para la música.","才能"],
  ["interés","el","intereses","Tengo mucho interés en este tema.","興味・関心"],
  ["afición","la","aficiones","Mi afición es la fotografía.","趣味・好み"],
  ["pasatiempo","el","pasatiempos","Mi pasatiempo favorito es leer.","趣味・暇つぶし"],
  ["destreza","la","destrezas","Con práctica se adquiere destreza.","技巧・器用さ"],
  ["hábito","el","hábitos","El ejercicio diario es un buen hábito.","習慣"],
  ["rutina","la","rutinas","Mi rutina matutina es muy fija.","ルーティン"],
  ["norma","la","normas","Hay que respetar las normas.","規則・規範"],
  ["regla","la","reglas","Esta es la regla más importante.","規則・ルール"],
  ["permiso","el","permisos","¿Tienes permiso para salir antes?","許可"],
  ["prohibición","la","prohibiciones","Está en prohibición aparcar aquí.","禁止"],
  ["acuerdo","el","acuerdos","Hemos llegado a un acuerdo.","合意・同意"],
  ["desacuerdo","el","desacuerdos","Hay muchos desacuerdos entre ellos.","不同意・意見の相違"],
  ["conversación","la","conversaciones","Tuvimos una conversación muy interesante.","会話"],
  ["debate","el","debates","Participé en un debate sobre el medio ambiente.","討論"],
  ["discurso","el","discursos","El discurso del presidente fue muy largo.","演説・スピーチ"],
  ["consejo","el","consejos","¿Me puedes dar un consejo?","アドバイス・助言"],
  ["ayuda","la","ayudas","Necesito tu ayuda.","助け・援助"],
  ["apoyo","el","apoyos","Gracias por tu apoyo.","サポート・支持"],
  ["colaboración","la","colaboraciones","La colaboración fue muy productiva.","協力"],
  ["competencia","la","competencias","Hay mucha competencia en este sector.","競争・能力"],
  ["progreso","el","progresos","He hecho mucho progreso.","進歩"],
  ["desarrollo","el","desarrollos","El desarrollo tecnológico es muy rápido.","発展・開発"],
  ["innovación","la","innovaciones","La innovación es clave para el futuro.","革新・イノベーション"],
  ["cambio","el","cambios","El cambio climático es un problema grave.","変化・変更"],
  ["reforma","la","reformas","El gobierno anunció nuevas reformas.","改革"],
  ["mejora","la","mejoras","Ha habido una mejora notable.","改善"],
  ["crecimiento","el","crecimientos","El crecimiento económico es positivo.","成長"],
  ["aumento","el","aumentos","Hay un aumento de los precios.","増加・値上がり"],
  ["reducción","la","reducciones","Se necesita una reducción de costes.","削減・減少"],
  ["información","la","informaciones","Necesito más información.","情報"],
  ["dato","el","datos","Los datos confirman la teoría.","データ・数値"],
  ["estadística","la","estadísticas","Las estadísticas muestran una mejora.","統計"],
  ["investigación","la","investigaciones","La investigación lleva tiempo.","研究・調査"],
  ["experimento","el","experimentos","El experimento salió bien.","実験"],
  ["descubrimiento","el","descubrimientos","Fue un gran descubrimiento.","発見"],
  ["invento","el","inventos","El móvil es un gran invento.","発明"],
  ["tecnología","la","tecnologías","La tecnología avanza muy rápido.","テクノロジー・技術"],
  ["ciencia","la","ciencias","Me interesa mucho la ciencia.","科学"],
  ["naturaleza","la","—","Hay que cuidar la naturaleza.","自然"],
  ["medio ambiente","el","—","Debemos proteger el medio ambiente.","環境"],
  ["contaminación","la","—","La contaminación es un problema grave.","汚染"],
  ["energía","la","energías","Necesitamos más energía renovable.","エネルギー"],
  ["clima","el","climas","El clima de España es muy agradable.","気候"],
  ["número","el","números","¿Cuál es tu número de teléfono?","番号・数"],
  ["nombre","el","nombres","¿Cómo te llamas? ¿Cuál es tu nombre?","名前"],
  ["apellido","el","apellidos","Mi apellido es Yamamoto.","苗字"],
  ["edad","la","edades","¿Cuántos años tienes? ¿Cuál es tu edad?","年齢"],
  ["nacionalidad","la","nacionalidades","¿Cuál es tu nacionalidad?","国籍"],
  ["idioma","el","idiomas","¿Cuántos idiomas hablas?","言語"],
  ["acento","el","acentos","Tiene un acento muy fuerte.","アクセント・なまり"],
  ["pronunciación","la","—","Tu pronunciación ha mejorado mucho.","発音"],
  ["gramática","la","—","La gramática española no es tan difícil.","文法"],
  ["vocabulario","el","—","Tengo que ampliar mi vocabulario.","語彙"],
  ["ejercicio","el","ejercicios","Haz los ejercicios de la página 10.","練習問題・運動"],
  ["práctica","la","prácticas","La práctica hace al maestro.","練習・実践"],
  ["tarea","la","tareas","Tengo muchas tareas que hacer.","課題・タスク"],
  ["deber","el","deberes","Tengo que hacer los deberes.","宿題・義務"],
  ["lección","la","lecciones","Esta es la lección más difícil.","レッスン・教訓"],
  ["tema","el","temas","¿Cuál es el tema de hoy?","テーマ・話題"],
  ["contenido","el","contenidos","El contenido del libro es muy interesante.","内容"],
  ["significado","el","significados","¿Cuál es el significado de esta palabra?","意味"],
  ["traducción","la","traducciones","La traducción no es exacta.","翻訳"],
  ["expresión","la","expresiones","Aprendí una expresión nueva hoy.","表現・表情"],
  ["frase","la","frases","Escribe una frase con esta palabra.","文・フレーズ"],
  ["texto","el","textos","Lee el texto y contesta las preguntas.","テキスト・文章"],
  ["párrafo","el","párrafos","El primer párrafo es muy bueno.","段落"],
  ["capítulo","el","capítulos","Estoy en el tercer capítulo.","章"],
  ["índice","el","índices","Consulta el índice del libro.","索引・目次"],
  ["portada","la","portadas","La portada del libro es muy bonita.","表紙"],
  ["autor","el","autores","¿Quién es el autor de este libro?","著者（男）"],
  ["autora","la","autoras","La autora de esta novela es muy conocida.","著者（女）"],
  ["personaje","el","personajes","El personaje principal es muy interesante.","登場人物・キャラクター"],
  ["cuento","el","cuentos","Los cuentos infantiles son muy bonitos.","童話・短編"],
  ["poema","el","poemas","Escribió un poema muy bonito.","詩"],
  ["obra","la","obras","Vi una obra de teatro fantástica.","作品・演劇"],
  ["arte","el","—","El arte moderno me parece muy interesante.","芸術・アート"],
  ["pintura","la","pinturas","La pintura de Velázquez es famosa.","絵画"],
  ["escultura","la","esculturas","Esta escultura es muy antigua.","彫刻"],
  ["arquitectura","la","—","La arquitectura española es muy variada.","建築"],
  ["diseño","el","diseños","El diseño del producto es muy moderno.","デザイン"],
  ["moda","la","modas","La moda española es muy creativa.","ファッション"],
  ["estilo","el","estilos","Tiene un estilo muy personal.","スタイル"],
  ["color","el","colores","¿Cuál es tu color favorito?","色"],
  ["rojo","","—","Lleva un vestido rojo muy bonito.","赤"],
  ["azul","","—","El cielo es de color azul.","青"],
  ["verde","","—","Los árboles son verdes en primavera.","緑"],
  ["amarillo","","—","Los girasoles son amarillos.","黄色"],
  ["negro","","—","Lleva ropa negra.","黒"],
  ["blanco","","—","La nieve es blanca.","白"],
  ["gris","","—","El cielo está gris hoy.","グレー"],
  ["marrón","","—","El perro es de color marrón.","茶色"],
  ["rosa","","—","Las flores son de color rosa.","ピンク"],
  ["morado","","—","Lleva una bufanda de color morado.","紫"],
  ["círculo","el","círculos","Dibuja un círculo.","円"],
  ["cuadrado","el","cuadrados","Es un cuadrado perfecto.","正方形"],
  ["triángulo","el","triángulos","El tejado tiene forma de triángulo.","三角形"],
  ["tamaño","el","tamaños","¿Qué tamaño necesitas?","サイズ・大きさ"],
  ["peso","el","pesos","¿Cuál es el peso del paquete?","重さ・体重"],
  ["altura","la","alturas","¿Cuál es tu altura?","身長・高さ"],
  ["longitud","la","longitudes","La longitud del río es enorme.","長さ"],
  ["distancia","la","distancias","¿A qué distancia está?","距離"],
  ["velocidad","la","velocidades","El tren va a gran velocidad.","速度・速さ"],
  ["uno","","—","Uno más uno son dos.","1（数字）"],
  ["dos","","—","Tengo dos hermanos.","2（数字）"],
  ["tres","","—","Son las tres de la tarde.","3（数字）"],
  ["cuatro","","—","Hay cuatro estaciones.","4（数字）"],
  ["cinco","","—","Tengo cinco minutos.","5（数字）"],
  ["diez","","—","Son las diez de la mañana.","10（数字）"],
  ["veinte","","—","Tengo veinte años.","20（数字）"],
  ["cien","","—","Cuesta cien euros.","100（数字）"],
  ["mil","","—","Hay mil personas.","1000（数字）"],
  ["tercero","","—","Es la tercera vez que vengo.","3番目"],
  ["ambos","","—","Ambos tienen razón.","両方"],
  ["varios","","—","Hay varios problemas.","いくつかの"],
  ["alguno","","—","Algún día lo conseguiré.","いくつかの・ある"],
  ["ninguno","","—","No hay ningún problema.","どれも〜ない"],
  ["cada","","—","Cada día aprendo algo nuevo.","それぞれの・毎〜"],
  ["cualquier","","—","Cualquier pregunta es bienvenida.","どんな〜でも"],
  ["propio","","—","Vivo en mi propio apartamento.","自分自身の"],
  ["ajeno","","—","No te metas en asuntos ajenos.","他人の"],
  ["así","","—","Hazlo así, de esta manera.","このように・そのように"],
  ["tan","","—","No es tan difícil como parece.","それほど・とても"],
  ["tanto","","—","No comas tanto.","それほど・そんなに"],
  ["cuanto","","—","Cuanto antes, mejor.","〜するほど"],
  ["mientras","","—","Escucho música mientras estudio.","〜しながら・その間に"],
  ["aunque","","—","Aunque es difícil, lo intentaré.","〜だけれど・たとえ〜でも"],
  ["porque","","—","No fui porque estaba enfermo.","なぜなら〜だから"],
  ["para","","—","Estudio para aprender español.","〜のために・〜に向けて"],
  ["por","","—","Gracias por tu ayuda.","〜によって・〜のために"],
  ["desde","","—","Vivo aquí desde hace cinco años.","〜から（起点）"],
  ["hasta","","—","Trabajo hasta las seis.","〜まで"],
  ["durante","","—","Dormí durante el viaje.","〜の間"],
  ["antes de","","—","Llega antes de las ocho.","〜の前に"],
  ["después de","","—","Te llamo después de la reunión.","〜の後で"],
  ["sin","","—","No puedo vivir sin música.","〜なしに"],
  ["con","","—","Voy con mi familia.","〜と一緒に・〜で"],
  ["entre","","—","El parque está entre las dos calles.","〜の間に"],
  ["sobre","","—","El libro está sobre la mesa.","〜の上に・〜について"],
  ["dentro de","","—","Estamos dentro de la casa.","〜の中に"],
  ["fuera de","","—","Espera fuera de la sala.","〜の外に"],
  ["alrededor de","","—","Hay parques alrededor de la ciudad.","〜の周りに"],
  ["a través de","","—","Aprendí español a través de la música.","〜を通じて"],
  ["además de","","—","Además de español, hablo inglés.","〜に加えて"],
  ["en vez de","","—","En vez de ir en coche, fui andando.","〜の代わりに"],
  ["gracias a","","—","Gracias a ti, lo conseguí.","〜のおかげで"],
  ["a pesar de","","—","A pesar del frío, salimos a pasear.","〜にもかかわらず"],
  ["de acuerdo","","—","De acuerdo, nos vemos mañana.","了解・合意"],
  ["por supuesto","","—","Por supuesto que sí.","もちろん"],
  ["en serio","","—","¿Lo dices en serio?","本気で・本当に"],
  ["de verdad","","—","¿De verdad no lo sabías?","本当に"],
  ["por favor","","—","Un café, por favor.","どうか・お願いします"],
  ["gracias","","—","Muchas gracias por tu ayuda.","ありがとう"],
  ["de nada","","—","De nada, para eso estoy.","どういたしまして"],
  ["perdón","","—","Perdón, ¿puede repetirlo?","すみません・ごめんなさい"],
  ["lo siento","","—","Lo siento mucho.","申し訳ない"],
  ["hola","","—","Hola, ¿cómo estás?","こんにちは"],
  ["adiós","","—","Adiós, hasta pronto.","さようなら"],
  ["buenos días","","—","Buenos días, ¿cómo está usted?","おはようございます"],
  ["buenas tardes","","—","Buenas tardes, ¿en qué puedo ayudarle?","こんにちは（午後）"],
  ["buenas noches","","—","Buenas noches, hasta mañana.","こんばんは・おやすみ"],
  ["hasta luego","","—","Hasta luego, cuídate.","じゃあまた"],
  ["hasta mañana","","—","Hasta mañana, buenas noches.","また明日"],
  ["¿cómo estás?","","—","¿Cómo estás? Hace mucho que no te veo.","元気ですか？"],
  ["¿cuánto cuesta?","","—","¿Cuánto cuesta este abrigo?","いくらですか？"],
  ["¿dónde está?","","—","¿Dónde está la estación?","〜はどこですか？"],
  ["¿a qué hora?","","—","¿A qué hora empieza la clase?","何時に？"],
  ["¿qué hora es?","","—","¿Qué hora es, por favor?","何時ですか？"],
  ["¿qué tal?","","—","¿Qué tal te ha ido hoy?","どうでしたか？"],
  ["bienvenido","","—","¡Bienvenido a España!","ようこそ"],
  ["enhorabuena","","—","¡Enhorabuena por tu aprobado!","おめでとう"],
  ["¡que aproveche!","","—","¡Que aproveche! La comida está lista.","いただきます・召し上がれ"],
  ["¡ánimo!","","—","¡Ánimo! Tú puedes.","頑張れ！"],
  ["¡suerte!","","—","¡Mucha suerte en el examen!","頑張って！幸運を！"],
  ["¡claro!","","—","¡Claro que sí! Con mucho gusto.","もちろん！"],
  ["¡vale!","","—","¡Vale! Nos vemos a las ocho.","オーケー！わかった！"],
  ["ojalá","","—","Ojalá que todo salga bien.","〜であればいいのに"],
];

const freshStats = () => ({
  esToJa: { level: 0, seen: 0, lastSeen: 0 },
  jaToEs: { level: 0, seen: 0, lastSeen: 0 },
});

const makeWord = (g) => ({
  id: "w-" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36),
  spanish: g[0], gender: g[1], plural: g[2], exampleES: g[3], japanese: g[4],
  stats: freshStats(),
});

/* ─── 永続化（localStorage） ─── */
const KEY = "vokabel:words:spanish:v1";
function loadWords() {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) return JSON.parse(stored);
  } catch (_) {}
  return null;
}
function saveWords(words) {
  try {
    localStorage.setItem(KEY, JSON.stringify(words));
  } catch (_) {}
}

/* ─── シャッフル（Fisher-Yates） ─── */
function shuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/* ─── 出題キュー：習熟度が低い順、同じレベル内ではシャッフル ─── */
const MAX_LEVEL = 5;
function buildQueue(words, dir) {
  const grouped = {};
  words.forEach((w) => {
    const level = w.stats[dir].level;
    if (!grouped[level]) grouped[level] = [];
    grouped[level].push(w.id);
  });
  const queue = [];
  for (let level = 0; level <= MAX_LEVEL; level++) {
    if (grouped[level]) queue.push(...shuffle(grouped[level]));
  }
  return queue;
}

/* ══════════════════════════════════════════════════════════ */
export default function App() {
  const [words, setWords] = useState(null);
  const [view, setView] = useState("study");
  const [dir, setDir] = useState("esToJa");   // esToJa | jaToEs

  const [queue, setQueue] = useState([]);
  const [qPos, setQPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionDone, setSessionDone] = useState({ deleted: 0, retest: 0 });

  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("");

  /* 初回ロード */
  useEffect(() => {
    const stored = loadWords();
    if (stored && stored.length) {
      setWords(stored);
    } else {
      const seeded = SEED.map(makeWord);
      setWords(seeded);
      saveWords(seeded);
    }
  }, []);

  /* 保存（words 変化時） */
  const firstSave = useRef(true);
  useEffect(() => {
    if (words === null) return;
    if (firstSave.current) { firstSave.current = false; return; }
    saveWords(words);
  }, [words]);

  /* セッション開始 */
  const startSession = useCallback(() => {
    if (!words) return;
    setQueue(buildQueue(words, dir));
    setQPos(0);
    setFlipped(false);
    setSessionDone({ deleted: 0, retest: 0 });
  }, [words, dir]);

  useEffect(() => {
    if (words && words.length > 0) startSession();
  }, [dir, words, startSession]);

  const wordById = (id) => words?.find((w) => w.id === id);
  const currentId = queue[qPos];
  const current = currentId ? wordById(currentId) : null;

  /* 削除：単語帳から消して次へ */
  function deleteCurrent() {
    if (!current) return;
    const id = current.id;
    setWords((prev) => prev.filter((w) => w.id !== id));
    setQueue((prev) => prev.filter((qid) => qid !== id));
    setSessionDone((d) => ({ ...d, deleted: d.deleted + 1 }));
    setFlipped(false);
  }

  /* 再テスト：キュー末尾付近に再挿入 */
  function retestCurrent() {
    if (!current) return;
    const id = current.id;
    setQueue((prev) => {
      const next = prev.filter((qid) => qid !== id);
      const insertAt = next.length > 2
        ? next.length - Math.floor(Math.random() * Math.min(3, next.length)) - 1
        : next.length;
      const result = [...next];
      result.splice(insertAt, 0, id);
      return result;
    });
    setSessionDone((d) => ({ ...d, retest: d.retest + 1 }));
    setFlipped(false);
    setQPos((p) => p + 1);
  }

  /* シャッフル */
  function shuffleQueue() {
    setQueue((prev) => shuffle(prev));
    setQPos(0);
    setFlipped(false);
  }

  /* 単語の保存／削除 */
  function upsertWord(data) {
    setWords((prev) => {
      if (data.id && prev.some((w) => w.id === data.id)) {
        return prev.map((w) => (w.id === data.id ? { ...w, ...data } : w));
      }
      const nw = {
        id: "w-" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36),
        stats: freshStats(), ...data,
      };
      return [nw, ...prev];
    });
    setEditing(null);
  }
  function deleteWord(id) {
    setWords((prev) => prev.filter((w) => w.id !== id));
  }

  /* 書き出し／読み込み */
  function exportJSON() {
    const blob = new Blob([JSON.stringify(words, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "vokabel-spanish-backup.json"; a.click();
    URL.revokeObjectURL(url);
  }
  function importJSON(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const arr = JSON.parse(reader.result);
        if (Array.isArray(arr)) {
          const cleaned = arr.map((w) => ({ ...w, stats: w.stats || freshStats() }));
          setWords(cleaned);
        }
      } catch (_) { alert("ファイルを読み込めませんでした。"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  if (words === null) {
    return (
      <div className="vk-root" style={{ display: "grid", placeItems: "center", padding: 24 }}>
        <style>{STYLE}</style>
        <div style={{ opacity: .6, fontSize: 14 }}>読み込み中…</div>
      </div>
    );
  }

  return (
    <div className="vk-root">
      <style>{STYLE}</style>
      <div style={{ maxWidth: 460, margin: "0 auto", padding: "18px 18px 32px", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>

        {/* ── ヘッダー ── */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
            <span className="vk-serif" style={{ fontSize: 23, fontWeight: 600, letterSpacing: "-.01em" }}>Vokabel</span>
            <span className="vk-mono" style={{ fontSize: 10.5, color: "#6F727D", letterSpacing: ".08em" }}>ES · JP</span>
          </div>
          <nav style={{ display: "flex", gap: 4, background: "rgba(255,255,255,.05)", padding: 4, borderRadius: 12 }}>
            <TabBtn active={view === "study"} onClick={() => setView("study")}><Layers size={15} /> 学習</TabBtn>
            <TabBtn active={view === "manage"} onClick={() => setView("manage")}><Search size={15} /> 単語帳</TabBtn>
          </nav>
        </header>

        {view === "study"
          ? <StudyView
              dir={dir} setDir={setDir}
              current={current} flipped={flipped} setFlipped={setFlipped}
              onDelete={deleteCurrent} onRetest={retestCurrent} onShuffle={shuffleQueue}
              qPos={qPos} total={queue.length}
              sessionDone={sessionDone} restart={startSession}
              hasWords={words.length > 0} goManage={() => { setView("manage"); setEditing("new"); }}
            />
          : <ManageView
              words={words} filter={filter} setFilter={setFilter}
              onAdd={() => setEditing("new")} onEdit={(w) => setEditing(w)}
              onDelete={deleteWord} onExport={exportJSON} onImport={importJSON}
            />
        }
      </div>

      {editing && (
        <WordForm
          word={editing === "new" ? null : editing}
          onSave={upsertWord}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/* ─── タブ ─── */
function TabBtn({ active, onClick, children }) {
  return (
    <button className="vk-btn" onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6, padding: "7px 13px",
        borderRadius: 9, fontSize: 13, fontWeight: 600,
        background: active ? "#EDEAE2" : "transparent",
        color: active ? "#16171C" : "#9A9DA6",
      }}>
      {children}
    </button>
  );
}

/* ════════ 学習ビュー ════════ */
function StudyView({ dir, setDir, current, flipped, setFlipped, onDelete, onRetest, onShuffle, qPos, total, sessionDone, restart, hasWords, goManage }) {
  const progress = total ? Math.min(qPos, total) / total : 0;

  if (!hasWords) {
    return (
      <EmptyState
        title="まだ単語がありません"
        body="最初の単語を登録して学習を始めましょう。性・複数形・例文も記録できます。"
        action="単語を追加" onAction={goManage}
      />
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* 方向トグル + シャッフルボタン */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <DirectionToggle dir={dir} setDir={setDir} />
        </div>
        <button className="vk-btn vk-icon-btn" onClick={onShuffle} title="シャッフル"
          style={{ width: 46, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 13, color: "#9DA1AB" }}>
          <Shuffle size={17} />
        </button>
      </div>

      {/* 進捗バー */}
      <div style={{ height: 4, background: "rgba(255,255,255,.07)", borderRadius: 99, margin: "16px 0 18px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress * 100}%`, background: "linear-gradient(90deg,#3B79B6,#BE4763)", borderRadius: 99, transition: "width .4s ease" }} />
      </div>

      {qPos >= total
        ? <SessionComplete done={sessionDone} onRestart={restart} />
        : current && (
          <FlashCard
            key={current.id + dir}
            word={current} dir={dir} flipped={flipped}
            onFlip={() => setFlipped((f) => !f)}
            onDelete={onDelete} onRetest={onRetest}
            counter={`${qPos + 1} / ${total}`}
          />
        )}
    </div>
  );
}

function DirectionToggle({ dir, setDir }) {
  const isES = dir === "esToJa";
  return (
    <button className="vk-btn" onClick={() => setDir(isES ? "jaToEs" : "esToJa")}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 13, padding: "11px 16px", width: "100%",
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="vk-mono" style={{ fontSize: 15, fontWeight: 600, color: "#F2EFE7" }}>
          {isES ? "ES" : "JP"}
        </span>
        <span style={{ fontSize: 13, color: "#9DA1AB" }}>
          を見て答える
        </span>
      </div>
      <ArrowLeftRight size={15} color="#5E6170" />
    </button>
  );
}

/* ─── フラッシュカード本体 ─── */
function FlashCard({ word, dir, flipped, onFlip, onDelete, onRetest, counter }) {
  const gc = genderColor(word.gender);
  const isNoun = !!word.gender;
  const spanishIsPrompt = dir === "esToJa";

  return (
    <div className="vk-pop" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div className="vk-card-shell" style={{ flex: 1, minHeight: 340, height: 340, position: "relative" }}>
        <div className={"vk-card-inner" + (flipped ? " flipped" : "")} onClick={onFlip} role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onFlip(); } }}
          style={{ cursor: "pointer", position: "absolute", inset: 0 }}>

          {/* 表 */}
          <div className="vk-face" style={faceStyle(spanishIsPrompt ? gc : "#8A8A95")}>
            {spanishIsPrompt
              ? <SpanishFace word={word} gc={gc} isNoun={isNoun} counter={counter} prompt />
              : <JapaneseFace word={word} counter={counter} prompt />}
          </div>

          {/* 裏 */}
          <div className="vk-face back" style={faceStyle(spanishIsPrompt ? "#8A8A95" : gc)}>
            {spanishIsPrompt
              ? <JapaneseFace word={word} counter={counter} />
              : <SpanishFace word={word} gc={gc} isNoun={isNoun} counter={counter} />}
          </div>
        </div>
      </div>

      {/* 操作部：裏面表示時のみ */}
      {flipped && (
        <div className="vk-fade" style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <ActionBtn onClick={onDelete} tone="delete">削除<span>Borrar</span></ActionBtn>
          <ActionBtn onClick={onRetest} tone="retest">再テスト<span>Repetir</span></ActionBtn>
        </div>
      )}
    </div>
  );
}

function faceStyle(edge) {
  return {
    background: "linear-gradient(180deg,#FBF9F3,#F3EFE4)",
    color: "#1A1A20",
    borderLeft: `6px solid ${edge}`,
    boxShadow: "0 18px 40px -16px rgba(0,0,0,.6), 0 2px 0 rgba(255,255,255,.04)",
  };
}

/* スペイン語の面（辞書エントリ風） */
function SpanishFace({ word, gc, isNoun, counter, prompt }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "22px 24px" }}>
      <FaceTag text={prompt ? "Español" : "Respuesta"} sub={counter} color={gc} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14 }}>
        <div>
          {isNoun && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span className="vk-serif" style={{ fontSize: 20, fontWeight: 600, fontStyle: "italic", color: gc }}>{word.gender}</span>
              <span style={{ fontSize: 10.5, letterSpacing: ".06em", color: gc, opacity: .8, textTransform: "uppercase" }}>{GENDERS[word.gender].label}</span>
            </div>
          )}
          <div className="vk-serif" style={{ fontSize: 40, fontWeight: 600, lineHeight: 1.05, letterSpacing: "-.015em", color: "#16161B" }}>
            {word.spanish}
          </div>
          {isNoun && word.plural && word.plural !== "—" && (
            <div className="vk-mono" style={{ fontSize: 13, color: "#76747A", marginTop: 8 }}>
              Pl. {word.plural}
            </div>
          )}
        </div>
        {word.exampleES && (
          <div className="vk-serif" style={{ fontStyle: "italic", fontSize: 16, lineHeight: 1.5, color: "#494750", borderLeft: "2px solid " + gc, paddingLeft: 12 }}>
            {word.exampleES}
          </div>
        )}
      </div>
    </div>
  );
}

/* 日本語の面 */
function JapaneseFace({ word, counter, prompt }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "22px 24px" }}>
      <FaceTag text={prompt ? "日本語" : "意味"} sub={counter} color="#8A8A95" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 38, fontWeight: 700, color: "#16161B", textAlign: "center", lineHeight: 1.2 }}>
          {word.japanese}
        </div>
        {!prompt && word.gender && (
          <div className="vk-mono" style={{ marginTop: 12, fontSize: 12, color: genderColor(word.gender) }}>
            {word.gender} {word.spanish}
          </div>
        )}
      </div>
    </div>
  );
}

function FaceTag({ text, sub, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color }}>{text}</span>
      <span className="vk-mono" style={{ fontSize: 11, color: "#A8A39A" }}>{sub}</span>
    </div>
  );
}

function ActionBtn({ onClick, tone, children }) {
  const styles = tone === "retest"
    ? { bg: "rgba(59,121,182,.14)", bd: "rgba(59,121,182,.4)", fg: "#7FA8D6" }
    : { bg: "rgba(190,71,99,.13)", bd: "rgba(190,71,99,.4)", fg: "#E58AA0" };
  return (
    <button className="vk-btn vk-rate" onClick={onClick}
      style={{ flex: 1, padding: "14px", borderRadius: 14, background: styles.bg, border: `1px solid ${styles.bd}`, color: styles.fg, fontWeight: 600, fontSize: 15, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      {children[0]}
      <span className="vk-mono" style={{ fontSize: 10, opacity: .6, fontWeight: 400 }}>{children[1]}</span>
    </button>
  );
}

/* ─── セッション完了 ─── */
function SessionComplete({ done, onRestart }) {
  return (
    <div className="vk-pop" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 18, padding: 20 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(59,121,182,.15)", display: "grid", placeItems: "center" }}>
        <Check size={30} color="#7FA8D6" />
      </div>
      <div>
        <div className="vk-serif" style={{ fontSize: 24, fontWeight: 600 }}>ひと回り完了</div>
        <div style={{ fontSize: 14, color: "#9A9DA6", marginTop: 6 }}>
          削除 {done.deleted} ・ 再テスト {done.retest}
        </div>
      </div>
      <button className="vk-btn" onClick={onRestart}
        style={{ padding: "12px 22px", borderRadius: 13, background: "#EDEAE2", color: "#16171C", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <RotateCcw size={16} /> もう一周する
      </button>
    </div>
  );
}

/* ════════ 単語帳ビュー ════════ */
function ManageView({ words, filter, setFilter, onAdd, onEdit, onDelete, onExport, onImport }) {
  const q = filter.trim().toLowerCase();
  const list = q
    ? words.filter((w) => (w.spanish + " " + w.japanese).toLowerCase().includes(q))
    : words;

  return (
    <div className="vk-fade" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={15} color="#62656F" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
          <input className="vk-input" style={{ paddingLeft: 36 }} placeholder="検索…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <button className="vk-btn" onClick={onAdd}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 16px", borderRadius: 12, background: "#EDEAE2", color: "#16171C", fontWeight: 600, fontSize: 14 }}>
          <Plus size={17} /> 追加
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, padding: "0 2px" }}>
        <span style={{ fontSize: 12, color: "#6F727D" }}>{list.length} 語</span>
        <div style={{ display: "flex", gap: 4 }}>
          <label className="vk-btn vk-icon-btn" style={{ width: 34, height: 34, color: "#9A9DA6", cursor: "pointer" }} title="読み込み">
            <Upload size={15} />
            <input type="file" accept="application/json" onChange={onImport} style={{ display: "none" }} />
          </label>
          <button className="vk-btn vk-icon-btn" style={{ width: 34, height: 34, color: "#9A9DA6" }} title="書き出し" onClick={onExport}>
            <Download size={15} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
        {list.length === 0 && (
          <div style={{ textAlign: "center", color: "#62656F", fontSize: 14, padding: "40px 0" }}>該当する単語がありません</div>
        )}
        {list.map((w) => (
          <WordRow key={w.id} word={w} onEdit={() => onEdit(w)} onDelete={() => onDelete(w.id)} />
        ))}
      </div>
    </div>
  );
}

function WordRow({ word, onEdit, onDelete }) {
  const gc = genderColor(word.gender);
  const [confirm, setConfirm] = useState(false);
  const lvl = (word.stats.esToJa.level + word.stats.jaToEs.level) / 2;
  return (
    <div className="vk-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 12px", borderRadius: 13, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.05)" }}>
      <div style={{ width: 3, alignSelf: "stretch", borderRadius: 99, background: gc, minHeight: 30 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          {word.gender && <span className="vk-serif" style={{ fontStyle: "italic", fontSize: 13, color: gc }}>{word.gender}</span>}
          <span className="vk-serif" style={{ fontSize: 17, fontWeight: 600, color: "#EDEAE2", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{word.spanish}</span>
        </div>
        <div style={{ fontSize: 12.5, color: "#83868F", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{word.japanese}</div>
      </div>
      <LevelDots level={lvl} />
      {confirm ? (
        <div style={{ display: "flex", gap: 4 }}>
          <button className="vk-btn vk-icon-btn" style={{ width: 32, height: 32, color: "#E58AA0", background: "rgba(190,71,99,.12)" }} onClick={onDelete}><Check size={15} /></button>
          <button className="vk-btn vk-icon-btn" style={{ width: 32, height: 32, color: "#9A9DA6" }} onClick={() => setConfirm(false)}><X size={15} /></button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 2 }}>
          <button className="vk-btn vk-icon-btn" style={{ width: 32, height: 32, color: "#9A9DA6" }} onClick={onEdit}><Pencil size={14} /></button>
          <button className="vk-btn vk-icon-btn" style={{ width: 32, height: 32, color: "#9A9DA6" }} onClick={() => setConfirm(true)}><Trash2 size={14} /></button>
        </div>
      )}
    </div>
  );
}

function LevelDots({ level }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: i < Math.round(level) ? "#3B79B6" : "rgba(255,255,255,.13)" }} />
      ))}
    </div>
  );
}

/* ════════ 入力フォーム（追加・編集）════════ */
function WordForm({ word, onSave, onCancel }) {
  const [f, setF] = useState({
    spanish:  word?.spanish  || "",
    gender:   word?.gender   || "",
    plural:   word?.plural   || "",
    exampleES: word?.exampleES || "",
    japanese: word?.japanese || "",
  });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const valid = f.spanish.trim() && f.japanese.trim();

  function submit() {
    if (!valid) return;
    onSave({ id: word?.id, ...f, spanish: f.spanish.trim(), japanese: f.japanese.trim() });
  }

  return (
    <div className="vk-fade" onClick={onCancel}
      style={{ position: "fixed", inset: 0, background: "rgba(8,9,12,.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}>
      <div className="vk-pop" onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 460, background: "#17181E", borderTopLeftRadius: 24, borderTopRightRadius: 24, border: "1px solid rgba(255,255,255,.08)", padding: "20px 18px calc(20px + env(safe-area-inset-bottom))" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <span className="vk-serif" style={{ fontSize: 19, fontWeight: 600 }}>{word ? "単語を編集" : "新しい単語"}</span>
          <button className="vk-btn vk-icon-btn" style={{ width: 34, height: 34, color: "#9A9DA6" }} onClick={onCancel}><X size={18} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="スペイン語 *">
            <input className="vk-input" value={f.spanish} onChange={set("spanish")} placeholder="casa" autoFocus />
          </Field>

          <div>
            <Label>性（名詞のみ）</Label>
            <div style={{ display: "flex", gap: 7 }}>
              {["", "el", "la"].map((g) => (
                <button key={g || "none"} className="vk-btn"
                  onClick={() => setF((p) => ({ ...p, gender: g }))}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 11, fontSize: 14, fontWeight: 600,
                    fontFamily: g ? "'Spectral',serif" : "inherit", fontStyle: g ? "italic" : "normal",
                    background: f.gender === g ? (g ? genderColor(g) : "#3A3D47") : "rgba(255,255,255,.05)",
                    color: f.gender === g ? "#fff" : "#8A8D96",
                    border: "1px solid " + (f.gender === g ? "transparent" : "rgba(255,255,255,.07)"),
                  }}>
                  {g || "なし"}
                </button>
              ))}
            </div>
          </div>

          <Field label="複数形">
            <input className="vk-input" value={f.plural} onChange={set("plural")} placeholder="casas" />
          </Field>
          <Field label="例文（スペイン語）">
            <textarea className="vk-input" rows={2} value={f.exampleES} onChange={set("exampleES")} placeholder="La casa es grande." style={{ resize: "none", lineHeight: 1.5 }} />
          </Field>
          <Field label="日本語の意味 *">
            <input className="vk-input" value={f.japanese} onChange={set("japanese")} placeholder="家" />
          </Field>
        </div>

        <button className="vk-btn" onClick={submit} disabled={!valid}
          style={{ width: "100%", marginTop: 18, padding: "14px", borderRadius: 14, background: valid ? "#EDEAE2" : "#2A2C34", color: valid ? "#16171C" : "#5A5D66", fontWeight: 600, fontSize: 15, cursor: valid ? "pointer" : "not-allowed" }}>
          {word ? "保存する" : "追加する"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><Label>{label}</Label>{children}</div>;
}
function Label({ children }) {
  return <div style={{ fontSize: 12, color: "#83868F", marginBottom: 6, fontWeight: 500 }}>{children}</div>;
}

/* ─── 空状態 ─── */
function EmptyState({ title, body, action, onAction }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 14, padding: 24 }}>
      <div style={{ width: 60, height: 60, borderRadius: 16, background: "rgba(255,255,255,.05)", display: "grid", placeItems: "center" }}>
        <Layers size={26} color="#7E818B" />
      </div>
      <div>
        <div className="vk-serif" style={{ fontSize: 21, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 14, color: "#9A9DA6", marginTop: 6, maxWidth: 280, lineHeight: 1.55 }}>{body}</div>
      </div>
      <button className="vk-btn" onClick={onAction}
        style={{ padding: "12px 20px", borderRadius: 13, background: "#EDEAE2", color: "#16171C", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <Plus size={17} /> {action}
      </button>
    </div>
  );
}
