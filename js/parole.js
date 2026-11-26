// Parole italiane di 5 lettere, senza accenti, per "Parola del giorno".
export const PAROLE = `
amico amore anima acqua aereo agosto alba albero alito altro
banco barca basso becco bello bimbo bocca bosco botte bravo
brodo bruco buono burro calce caldo calma campo canto carta
casco cassa cesto cielo cigno circo colla colpo conto corda
corpo corsa costa cuore danza dente dieta dolce donna drago
fango farro fiume foglia forno forte frase freno fritto fuoco
fungo gallo gamba gatto gelso gesto ghiro gioco gioia giro
gonna gusto isola latte legno letto libro lince lingua lista
luce lungo lupo madre magia mare marzo matto mazzo mela
mente mento mirto molla mondo monte morso mosca motto mucca
muro naso nave neve nido noce notte nuvola occhio olivo
onda orata orsi orto ospite padre paese palla palma panca
panda pane parco parte passo pasta patto pazzo penna pepe
perla pesca pesce piano piede pigro pista pizza pollo polpo
ponte porta posta prato primo pugno punto quota radio ramo
rana regno resto ricco riso rombo rosa ruota sacco salto
santo sasso scala scopa scuro sedia segno senso sera serra
sette siepe sogno sole sorte spada spesa sport stato stella
suono tacco talpa tanto tappo tasca tazza tempo terra testa
tetto tigre tondo torre torta treno trono tubo tuffo uccello
uomo uovo urlo vacca valle vasca vaso vento verde verme
vespa vetro vigna villa vino viola visto vita vitto vizio
volpe volto zaino zampa zebra zucca zuppa
`.split(/\s+/).filter(p => p.length === 5);
