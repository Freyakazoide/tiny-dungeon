"""Tabela única das 90 especializações (Tier 2): 15 classes × 6 (3 puras + 3 híbridas). Edite aqui e rode gen_tier2.py.

Linha: id, nome, pai, tipo, requisitos, tagline, (passiva: nome, efeitos), (magia: nome, modelo, elemento),
Tipos: P = pura (1 skill 38 [+ contador]); C = com contador (1 skill 35 + contador); H = híbrida (2 skills 35/35); E = N elementos (mago).
Requisitos: dict skill→nível; contador opcional ('counter'); 'elements' = (qtd, nível).
"""

P, C, H, E = 'P', 'C', 'H', 'E'


def S(id, name, parent, kind, skills, tagline, passive, spell, counter=None, elements=None, keystone=None):
    return dict(id=id, name=name, parent=parent, kind=kind, skills=skills, counter=counter, elements=elements, tagline=tagline,
                passive=passive, spell=spell, keystone=keystone)


SPECS = [
    # ---------------------------------------------------------------- MAGO (por estilo; o elemento é livre)
    S('evocador', 'Evocador', 'mago', P, {'magic': 38}, 'Explosões de magia concentradas em um alvo.', ('Poder Concentrado', [('magicPower', .14), ('crit', .04)]), ('Raio Concentrado', 'big', None),
      keystone=('Avatar da Evocação', 'Cada magia de dano aumenta em 5% o dano da seguinte (até 5 acúmulos).')),
    S('destruidor', 'Destruidor', 'mago', P, {'magic': 38}, 'Arrasa chefes com magias críticas.', ('Fúria Arcana', [('magicPower', .10), ('crit', .06)]), ('Cataclisma', 'aoe', None), counter='bossCrits',
      keystone=('Cataclisma Final', 'A cada 10 magias, a próxima causa o dobro do dano.')),
    S('ritualista', 'Ritualista', 'mago', C, {'magic': 35}, 'Rituais que potencializam a equipe inteira.', ('Círculo Ritual', [('maxMana', .15), ('cooldown', .06)]), ('Selo de Poder', 'teambuff', None), counter='buffsApplied',
      keystone=('Círculo Perfeito', 'Buffs que você aplica duram 50% mais.')),
    S('elementalista', 'Elementalista', 'mago', E, {}, 'Domina dois ou mais elementos ao mesmo tempo.', ('Harmonia Elemental', [('magicPower', .10), ('maxMana', .10), ('focusMagicDamage', .10), ('burnOnFireHit', .15), ('iceBarrier', .10)]), ('Rajada Elemental', 'aoe', None), elements=(2, 35),
      keystone=('Tempestade Elemental', 'Trocar o elemento em foco concede +20% de dano por 10 s.')),
    S('prismatico', 'Prismático', 'mago', E, {}, 'Combina muitos elementos para quebrar qualquer resistência.', ('Espectro Prismático', [('magicPower', .12), ('cooldown', .08), ('plasmaCrit', .08)]), ('Prisma', 'big', None), elements=(3, 30),
      keystone=('Luz Dividida', 'Magias ignoram a resistência elemental do alvo.')),
    S('polimata', 'Polímata', 'mago', E, {}, 'Conhece quase todos os elementos.', ('Saber Universal', [('magicPower', .10), ('maxMana', .12), ('cooldown', .05)]), ('Mosaico Arcano', 'aoe', None), elements=(5, 25),
      keystone=('Conhecimento Total', 'Dano elemental aumenta 3% para cada elemento acima do nível 20.')),

    # ---------------------------------------------------------------- GUERREIRO
    S('gladiador', 'Gladiador', 'guerreiro', P, {'melee': 38}, 'Luta para a plateia: críticos e golpes em área.', ('Aclamado da Arena', [('attack', .10), ('attackSpeed', .08)]), ('Golpe Espetacular', 'aoe', None), counter='crits'),
    S('berserker', 'Berserker', 'guerreiro', P, {'melee': 38}, 'Quanto mais apanha, mais bate.', ('Fúria Sanguinária', [('attack', .14), ('maxHp', .06)]), ('Investida Insana', 'big', None), counter='damageTaken'),
    S('campeao', 'Campeão', 'guerreiro', P, {'melee': 38}, 'Cresce com cada chefe derrotado.', ('Glória do Campeão', [('attack', .10), ('crit', .05), ('defense', .06)]), ('Desafio do Campeão', 'big', None), counter='bossKills',
      keystone=('Lenda Viva', 'Abater um chefe concede +20% de dano por 30 s.')),
    S('legionario', 'Legionário', 'guerreiro', H, {'melee': 35, 'defense': 35}, 'Soldado disciplinado: ataque e escudo.', ('Disciplina de Legião', [('defense', .12), ('attack', .08), ('maxHp', .06)]), ('Muralha de Escudos', 'shield', None),
      keystone=('Formação Fechada', 'Aliados na mesma linha recebem 10% menos dano.')),
    S('lutador_de_arena', 'Lutador de Arena', 'guerreiro', H, {'melee': 35, 'physical': 35}, 'Punhos e aço: combos físicos rápidos.', ('Punhos de Aço', [('attack', .12), ('attackSpeed', .08)]), ('Chuva de Socos', 'st', 'physical'),
      keystone=('Nocaute', 'Cada 5º golpe seguido atordoa o alvo por 1 s.')),
    S('brigao', 'Brigão', 'guerreiro', H, {'defense': 35, 'physical': 35}, 'Valentão resistente: socos e escudo.', ('Casca de Valentão', [('defense', .10), ('attack', .08), ('maxHp', .06)]), ('Cabeçada', 'st', 'physical'),
      keystone=('Cabeça Dura', 'Ataques físicos têm 10% de chance de ignorar a defesa do alvo.')),

    # ---------------------------------------------------------------- GUARDIÃO
    S('paladino', 'Paladino', 'guardiao', H, {'defense': 35, 'holy': 35}, 'Escudo e luz: protege e cura os aliados.', ('Juramento Sagrado', [('defense', .12), ('resistance', .08), ('magicPower', .06)]), ('Escudo Sagrado', 'teamshield', 'holy')),
    S('cavaleiro_negro', 'Cavaleiro Negro', 'guardiao', H, {'defense': 35, 'death': 35}, 'Armadura sombria que drena a vida do inimigo.', ('Pacto Sombrio', [('attack', .10), ('defense', .10), ('maxHp', .06)]), ('Golpe Sombrio', 'big', 'death')),
    S('bastiao', 'Bastião', 'guardiao', P, {'defense': 38}, 'Quanto mais dano absorve, mais forte fica.', ('Muralha Inabalável', [('defense', .16), ('maxHp', .10)]), ('Postura Inexpugnável', 'defbuff', None), counter='damageTaken',
      keystone=('Última Muralha', 'Abaixo de 30% de vida, recebe 30% menos dano.')),
    S('sentinela', 'Sentinela', 'guardiao', P, {'defense': 38}, 'Vigia constante: resistência acima de tudo.', ('Vigília Constante', [('resistance', .12), ('defense', .10)]), ('Alerta', 'defbuff', None),
      keystone=('Olhar Atento', 'Aliados recebem 8% menos dano enquanto você está vivo.')),
    S('colosso', 'Colosso', 'guardiao', P, {'defense': 38}, 'Um gigante de ferro que derruba chefes.', ('Gigante de Ferro', [('maxHp', .18), ('defense', .08)]), ('Pisão Colossal', 'aoe', 'physical'), counter='bossKills',
      keystone=('Passo do Gigante', 'Pisões atordoam todos os inimigos por 1 s.')),
    S('escudeiro_de_ferro', 'Escudeiro de Ferro', 'guardiao', H, {'defense': 35, 'melee': 35}, 'Usa o escudo como arma.', ('Escudo Ofensivo', [('defense', .10), ('attack', .10)]), ('Investida de Escudo', 'st', 'physical'),
      keystone=('Escudo Cortante', 'Parte da defesa vira dano nos ataques básicos.')),

    # ---------------------------------------------------------------- LADINO
    S('assassino', 'Assassino', 'ladino', P, {'melee': 38}, 'Golpes críticos devastadores em chefes.', ('Golpe de Misericórdia', [('crit', .10), ('attack', .08)]), ('Execução Silenciosa', 'big', None), counter='bossCrits'),
    S('mestre_das_sombras', 'Mestre das Sombras', 'ladino', H, {'melee': 35, 'death': 35}, 'Ataca das sombras com lâminas sinistras.', ('Véu das Sombras', [('attackSpeed', .10), ('crit', .06)]), ('Lâmina da Noite', 'st', 'death')),
    S('duelista', 'Duelista', 'ladino', P, {'melee': 38}, 'Dança com a lâmina: velocidade e críticos.', ('Dança da Lâmina', [('attackSpeed', .12), ('crit', .06)]), ('Riposte', 'st', None), counter='crits',
      keystone=('Passo Perfeito', 'Críticos concedem +5% de velocidade por 5 s (até 5 acúmulos).')),
    S('saqueador', 'Saqueador', 'ladino', P, {'melee': 38}, 'Rápido nas mãos e no bolso: ouro e drops.', ('Mãos Leves', [('attack', .08), ('attackSpeed', .08)]), ('Saque Rápido', 'st', None), counter='goldEarned',
      keystone=('Dedos de Ouro', 'Cada inimigo abatido tem 10% de chance de dar ouro em dobro.')),
    S('envenenador', 'Envenenador', 'ladino', H, {'melee': 35, 'poison': 35}, 'Lâminas banhadas em veneno.', ('Lâmina Peçonhenta', [('attack', .08), ('crit', .06)]), ('Corte Venenoso', 'st', 'poison'),
      keystone=('Dose Letal', 'Veneno acumula até 10 vezes e dobra o dano no último acúmulo.')),
    S('bailarino_de_laminas', 'Bailarino de Lâminas', 'ladino', H, {'melee': 35, 'physical': 35}, 'Giros cortantes que atingem todos.', ('Passos Cortantes', [('attackSpeed', .12), ('defense', .05)]), ('Redemoinho de Aço', 'aoe', 'physical'),
      keystone=('Tornado de Lâminas', 'Os ataques básicos giram e acertam até 3 inimigos.')),

    # ---------------------------------------------------------------- CAÇADOR
    S('atirador_de_elite', 'Atirador de Elite', 'cacador', P, {'ranged': 38}, 'Cada tiro é uma sentença.', ('Mira Perfeita', [('crit', .10), ('attack', .08)]), ('Tiro de Precisão', 'big', None)),
    S('mestre_das_feras', 'Mestre das Feras', 'cacador', H, {'ranged': 35, 'earth': 35}, 'Luta ao lado de animais selvagens.', ('Laço Selvagem', [('maxHp', .10), ('attack', .08)]), ('Chamado da Fera', 'st', 'earth')),
    S('franco_atirador', 'Franco-Atirador', 'cacador', P, {'ranged': 38}, 'Tiros na cabeça de chefes.', ('Tiro na Cabeça', [('crit', .12), ('attack', .06)]), ('Disparo Mortal', 'big', None), counter='bossCrits',
      keystone=('Olho do Falcão', 'Críticos em chefes causam +50% de dano.')),
    S('cacador_de_trofeus', 'Caçador de Troféus', 'cacador', P, {'ranged': 38}, 'Cresce a cada chefe caçado.', ('Troféu de Caça', [('attack', .10), ('maxHp', .06)]), ('Marca da Presa', 'st', None), counter='bossKills',
      keystone=('Coleção de Troféus', 'Cada chefe diferente abatido concede +2% de dano permanente.')),
    S('arqueiro_marcial', 'Arqueiro Marcial', 'cacador', H, {'ranged': 35, 'physical': 35}, 'Flechas cinéticas e rápidas.', ('Flecha Cinética', [('attack', .10), ('attackSpeed', .08)]), ('Tiro Cinético', 'st', 'physical'),
      keystone=('Disparo Duplo', 'Ataques básicos têm 25% de chance de disparar duas vezes.')),
    S('rastreador', 'Rastreador', 'cacador', H, {'earth': 35, 'physical': 35}, 'Sobrevive na natureza: armadilhas e emboscadas.', ('Instinto de Sobrevivência', [('defense', .10), ('maxHp', .10), ('resistance', .05)]), ('Armadilha', 'stun', 'earth'),
      keystone=('Terreno Seguro', 'Abaixo de 40% de vida, ganha uma barreira de 20% da vida.')),

    # ---------------------------------------------------------------- CLÉRIGO
    S('sumo_sacerdote', 'Sumo Sacerdote', 'clerigo', C, {'holy': 35}, 'A cura em pessoa: salva quem estiver caindo.', ('Mão da Providência', [('magicPower', .12), ('maxMana', .08)]), ('Cura Divina', 'teamheal', 'holy'), counter='healingDone'),
    S('inquisidor', 'Inquisidor', 'clerigo', H, {'holy': 35, 'magic': 35}, 'Fé como arma: queima os hereges.', ('Fogo da Fé', [('magicPower', .12), ('attack', .06)]), ('Julgamento', 'big', 'holy')),
    S('santo_padroeiro', 'Santo Padroeiro', 'clerigo', P, {'holy': 38}, 'Abençoa o grupo com auras duradouras.', ('Aura Benevolente', [('maxMana', .10), ('cooldown', .06), ('resistance', .05)]), ('Bênção Maior', 'teambuff', 'holy'), counter='buffsApplied',
      keystone=('Auréola', 'Buffs que você aplica também curam 3% da vida dos aliados.')),
    S('oraculo', 'Oráculo', 'clerigo', P, {'holy': 38}, 'Visões divinas que revelam e castigam.', ('Visão Divina', [('magicPower', .10), ('crit', .05), ('cooldown', .06)]), ('Revelação', 'aoe', 'holy'),
      keystone=('Profecia', 'A primeira magia de cada wave sempre acerta crítico.')),
    S('templario', 'Templário', 'clerigo', H, {'holy': 35, 'defense': 35}, 'Escudo da fé: cura e protege na linha de frente.', ('Escudo da Fé', [('defense', .10), ('resistance', .08), ('maxHp', .06)]), ('Égide Sagrada', 'teamshield', 'holy'),
      keystone=('Voto de Proteção', 'Curas feitas em você também dão barreira aos aliados.')),
    S('sentinela_arcana', 'Sentinela Arcana', 'clerigo', H, {'magic': 35, 'defense': 35}, 'Magia sagrada em forma de muralha.', ('Muralha de Luz', [('defense', .10), ('magicPower', .10), ('maxMana', .06)]), ('Muralha de Luz', 'teamshield', 'holy'),
      keystone=('Domo Sagrado', 'Barreiras de equipe duram 40% mais.')),

    # ---------------------------------------------------------------- BARDO
    S('maestro', 'Maestro', 'bardo', C, {'magic': 35}, 'Rege a equipe com buffs sem fim.', ('Regente', [('magicPower', .10), ('cooldown', .08)]), ('Sinfonia', 'teambuff', None), counter='buffsApplied'),
    S('menestrel_do_caos', 'Menestrel do Caos', 'bardo', H, {'magic': 35, 'psychic': 35}, 'Melodias que enlouquecem os inimigos.', ('Melodia Caótica', [('magicPower', .12), ('crit', .05)]), ('Nota Dissonante', 'stun', 'psychic')),
    S('trovador', 'Trovador', 'bardo', P, {'magic': 38}, 'Baladas épicas que inspiram a equipe.', ('Voz de Ouro', [('maxMana', .12), ('magicPower', .08)]), ('Balada Épica', 'teambuff', None),
      keystone=('Balada sem Fim', 'Buffs de equipe duram 30% mais.')),
    S('mestre_de_cerimonias', 'Mestre de Cerimônias', 'bardo', P, {'magic': 38}, 'Domina o palco e prende a atenção dos inimigos.', ('Presença de Palco', [('cooldown', .08), ('resistance', .06), ('magicPower', .06)]), ('Fanfarra', 'aoe', None), counter='controlSpells',
      keystone=('Holofotes', 'Inimigos controlados recebem 15% mais dano.')),
    S('harmonista_sagrado', 'Harmonista Sagrado', 'bardo', H, {'magic': 35, 'holy': 35}, 'Hinos que curam e protegem.', ('Hino Sagrado', [('maxMana', .10), ('magicPower', .08), ('resistance', .06)]), ('Canto de Cura', 'teamheal', 'holy'),
      keystone=('Coral Celestial', 'Curas em grupo também concedem regeneração por 5 s.')),
    S('cantor_visionario', 'Cantor Visionário', 'bardo', H, {'psychic': 35, 'holy': 35}, 'Canções que revelam e curam a mente.', ('Canto Profético', [('magicPower', .10), ('resistance', .08), ('maxMana', .08)]), ('Canto Visionário', 'teamheal', 'psychic'),
      keystone=('Visão Coral', 'Curas em grupo também removem atordoamentos dos aliados.')),

    # ---------------------------------------------------------------- MONGE
    S('mestre_do_chi', 'Mestre do Chi', 'monge', H, {'physical': 35, 'magic': 35}, 'Energia interior em cada golpe.', ('Fluxo do Chi', [('magicPower', .10), ('attackSpeed', .08)]), ('Onda de Chi', 'aoe', 'energy')),
    S('punho_de_ferro', 'Punho de Ferro', 'monge', H, {'physical': 35, 'defense': 35}, 'Corpo de aço e golpes pesados.', ('Pele de Ferro', [('defense', .12), ('resistance', .08)]), ('Postura de Ferro', 'defbuff', None)),
    S('punho_veloz', 'Punho Veloz', 'monge', P, {'physical': 38}, 'Mil socos por segundo.', ('Mãos Relâmpago', [('attackSpeed', .14), ('crit', .06)]), ('Mil Punhos', 'st', 'physical'), counter='crits',
      keystone=('Rajada Infinita', 'A cada 10 golpes, o próximo acerta 3 vezes.')),
    S('monge_errante', 'Monge Errante', 'monge', P, {'physical': 38}, 'Equilibrado: vida, velocidade e resistência.', ('Caminho do Viajante', [('maxHp', .10), ('attackSpeed', .08), ('resistance', .04)]), ('Passo Errante', 'buff', None),
      keystone=('Calma Interior', 'Recupera 1% de vida por segundo fora de combate imediato.')),
    S('pele_de_pedra', 'Pele de Pedra', 'monge', P, {'physical': 38}, 'Transforma dano sofrido em força.', ('Corpo de Pedra', [('maxHp', .14), ('defense', .10)]), ('Postura de Pedra', 'shield', None), counter='damageTaken',
      keystone=('Montanha Viva', 'Cada golpe recebido reduz o dano do próximo em 2% (até 20%).')),
    S('monge_guerreiro', 'Monge Guerreiro', 'monge', H, {'physical': 35, 'melee': 35}, 'Artes marciais armadas.', ('Arte Marcial', [('attack', .12), ('attackSpeed', .08)]), ('Combo Marcial', 'big', 'physical'),
      keystone=('Mestre de Armas', 'Armas equipadas concedem +10% de dano aos golpes desarmados.')),

    # ---------------------------------------------------------------- BRUXO
    S('necromante', 'Necromante', 'bruxo', P, {'death': 38}, 'Comanda o poder da morte.', ('Senhor dos Mortos', [('magicPower', .14), ('maxMana', .06)]), ('Toque da Morte', 'big', 'death')),
    S('epidemiologista', 'Epidemiologista', 'bruxo', C, {'poison': 35}, 'Doenças que corroem o grupo inimigo.', ('Contágio', [('magicPower', .10), ('crit', .05)]), ('Peste', 'aoe', 'poison'), counter='dotDamage'),
    S('ceifador', 'Ceifador', 'bruxo', P, {'death': 38}, 'Colhe a alma de chefes.', ('Colheita', [('magicPower', .12), ('crit', .05)]), ('Foice Espectral', 'big', 'death'), counter='bossKills',
      keystone=('Última Colheita', 'Inimigos abaixo de 15% de vida morrem instantaneamente.')),
    S('arquimago_sombrio', 'Arquimago Sombrio', 'bruxo', H, {'death': 35, 'magic': 35}, 'Magia pura sombria: dano arcano e morte.', ('Arcano Sombrio', [('magicPower', .14), ('maxMana', .06)]), ('Raio Sombrio', 'big', 'death'),
      keystone=('Poder Proibido', 'Magias de morte ignoram 20% da resistência do alvo.')),
    S('toxicomante', 'Toxicomante', 'bruxo', H, {'poison': 35, 'magic': 35}, 'Venenos arcanos de ação prolongada.', ('Veneno Arcano', [('magicPower', .10), ('crit', .05), ('maxMana', .06)]), ('Nuvem Arcana', 'aoe', 'poison'),
      keystone=('Peste Arcana', 'O dano contínuo cresce com o poder mágico.')),
    S('peconhento', 'Peçonhento', 'bruxo', H, {'death': 35, 'poison': 35}, 'Maldições que apodrecem de dentro.', ('Maldição Venenosa', [('magicPower', .10), ('crit', .05)]), ('Dardos Podres', 'st', 'poison'),
      keystone=('Podridão Total', 'Dano contínuo se espalha para inimigos próximos.')),

    # ---------------------------------------------------------------- ALQUIMISTA
    S('mestre_bombardeiro', 'Mestre Bombardeiro', 'alquimista', H, {'ranged': 35, 'fire': 35}, 'Explosivos que limpam a sala.', ('Pólvora Alquímica', [('attack', .10), ('crit', .05)]), ('Bomba Incendiária Maior', 'aoe', 'fire')),
    S('transmutador', 'Transmutador', 'alquimista', C, {'poison': 35}, 'Transforma poções em vantagem.', ('Transmutação', [('maxMana', .10), ('magicPower', .08)]), ('Elixir Maior', 'heal', None), counter='supportPotionsUsed'),
    S('herbalista', 'Herbalista', 'alquimista', P, {'poison': 38}, 'Ervas que curam a equipe.', ('Ervas Medicinais', [('maxHp', .10), ('magicPower', .08)]), ('Cataplasma', 'teamheal', None), counter='healingDone',
      keystone=('Jardim Medicinal', 'Curas deixam uma regeneração de 3 s nos aliados.')),
    S('quimico_louco', 'Químico Louco', 'alquimista', P, {'poison': 38}, 'Misturas instáveis de dano contínuo.', ('Mistura Instável', [('attack', .10), ('crit', .06)]), ('Mistura Explosiva', 'aoe', 'poison'), counter='dotDamage',
      keystone=('Reação em Cadeia', 'Quando um inimigo morre com veneno, explode causando dano aos vizinhos.')),
    S('boticario_atirador', 'Boticário Atirador', 'alquimista', H, {'poison': 35, 'ranged': 35}, 'Arremessa frascos de longe.', ('Frascos de Longe', [('attack', .10), ('attackSpeed', .06)]), ('Chuva de Frascos', 'aoe', 'poison'),
      keystone=('Cinto de Frascos', 'Ataques básicos têm 20% de chance de lançar um frasco extra.')),
    S('fogo_liquido', 'Fogo Líquido', 'alquimista', H, {'poison': 35, 'fire': 35}, 'Combustíveis que queimam sem parar.', ('Combustível', [('magicPower', .10), ('attack', .06), ('crit', .04)]), ('Chama Líquida', 'big', 'fire'),
      keystone=('Incêndio Químico', 'Dano de fogo e veneno se somam como dano contínuo.')),

    # ---------------------------------------------------------------- MERCENÁRIO
    S('cacador_de_recompensas', 'Caçador de Recompensas', 'mercenario', C, {'melee': 35}, 'Vive de chefes: cada cabeça paga.', ('Contrato de Caça', [('attack', .10), ('crit', .05)]), ('Marca da Recompensa', 'big', None), counter='bossKills'),
    S('corsario', 'Corsário', 'mercenario', C, {'melee': 35}, 'Pilhagem e velocidade: o ouro é a meta.', ('Butim', [('attack', .08), ('attackSpeed', .08)]), ('Abordagem', 'st', None), counter='goldEarned'),
    S('executor', 'Executor', 'mercenario', P, {'melee': 38}, 'Golpes finais certeiros.', ('Golpe Final', [('attack', .12), ('crit', .06)]), ('Execução', 'big', None), counter='crits',
      keystone=('Sentença', 'Golpes contra alvos abaixo de 25% de vida causam +40% de dano.')),
    S('guarda_costas', 'Guarda-Costas', 'mercenario', H, {'defense': 35, 'physical': 35}, 'Contratado para proteger: soco e escudo.', ('Contrato de Proteção', [('defense', .10), ('maxHp', .10), ('attack', .06)]), ('Interceptar', 'defbuff', None),
      keystone=('Cobertura', 'Aliados feridos recebem 10% menos dano.')),
    S('veterano', 'Veterano', 'mercenario', H, {'melee': 35, 'defense': 35}, 'Anos de guerra: casca grossa.', ('Casca Grossa', [('defense', .12), ('maxHp', .10)]), ('Postura Veterana', 'shield', None),
      keystone=('Cicatrizes', 'Cada ferida sofrida aumenta a defesa em 1% (até 15%).')),
    S('brutamontes', 'Brutamontes', 'mercenario', H, {'melee': 35, 'physical': 35}, 'Força bruta que esmaga tudo.', ('Força Bruta', [('attack', .14), ('maxHp', .06)]), ('Esmagar', 'big', 'physical'),
      keystone=('Marreta de Guerra', 'Golpes pesados quebram a defesa do alvo em 20% por 5 s.')),

    # ---------------------------------------------------------------- MESTRE RÚNICO
    S('forjador_de_laminas', 'Forjador de Lâminas', 'mestre_runico', H, {'magic': 35, 'melee': 35}, 'Lâminas gravadas com runas de poder.', ('Lâmina Gravada', [('attack', .10), ('magicPower', .08)]), ('Corte Rúnico', 'st', 'energy')),
    S('guardiao_das_runas', 'Guardião das Runas', 'mestre_runico', H, {'magic': 35, 'defense': 35}, 'Runas que protegem o grupo.', ('Runa Protetora', [('defense', .10), ('magicPower', .08), ('resistance', .05)]), ('Barreira Rúnica', 'teamshield', None)),
    S('escrivao_de_runas', 'Escrivão de Runas', 'mestre_runico', P, {'magic': 38}, 'Glifos explosivos de grande alcance.', ('Caligrafia Arcana', [('magicPower', .12), ('cooldown', .06)]), ('Glifo Explosivo', 'aoe', 'energy'),
      keystone=('Glifo Mestre', 'Magias deixam um glifo que explode 3 s depois.')),
    S('runa_ancestral', 'Runa Ancestral', 'mestre_runico', P, {'magic': 38}, 'Poder antigo que reforça aliados.', ('Poder Ancestral', [('maxMana', .10), ('magicPower', .08), ('cooldown', .05)]), ('Runa Ancestral', 'teambuff', None), counter='buffsApplied',
      keystone=('Sabedoria Antiga', 'Runas de buff duram o dobro.')),
    S('selador', 'Selador', 'mestre_runico', P, {'magic': 38}, 'Sela os inimigos no lugar.', ('Selo Restritivo', [('cooldown', .08), ('magicPower', .08), ('resistance', .05)]), ('Selo de Paralisia', 'stun', None), counter='controlSpells',
      keystone=('Lacre Perfeito', 'Inimigos atordoados ficam 1 s a mais sob efeito.')),
    S('runa_flamejante', 'Runa Flamejante', 'mestre_runico', H, {'magic': 35, 'fire': 35}, 'Runas de fogo que queimam em área.', ('Runas de Fogo', [('magicPower', .12), ('attack', .06)]), ('Runa Incandescente', 'aoe', 'fire'),
      keystone=('Pira Rúnica', 'Runas de fogo deixam o chão em chamas por 4 s.')),

    # ---------------------------------------------------------------- ILUSIONISTA
    S('mestre_dos_espelhos', 'Mestre dos Espelhos', 'ilusionista', H, {'psychic': 35, 'magic': 35}, 'Imagens que desviam o dano.', ('Reflexos', [('magicPower', .10), ('defense', .08)]), ('Espelho Refletor', 'shield', 'psychic')),
    S('hipnotizador', 'Hipnotizador', 'ilusionista', C, {'psychic': 35}, 'Olhar que paralisa os inimigos.', ('Olhar Hipnótico', [('cooldown', .08), ('magicPower', .08)]), ('Transe', 'stun', 'psychic'), counter='controlSpells'),
    S('pesadelo', 'Pesadelo', 'ilusionista', P, {'psychic': 38}, 'Terror mental de alto dano.', ('Terror Noturno', [('magicPower', .14), ('crit', .04)]), ('Pesadelo', 'big', 'psychic'),
      keystone=('Medo Profundo', 'Inimigos atordoados recebem 25% mais dano psíquico.')),
    S('tecelao_de_sonhos', 'Tecelão de Sonhos', 'ilusionista', P, {'psychic': 38}, 'Véus de sonho que protegem o grupo.', ('Sonhos Lúcidos', [('maxMana', .12), ('cooldown', .06)]), ('Véu de Sonhos', 'teamdef', 'psychic'), counter='buffsApplied',
      keystone=('Sono Reparador', 'Buffs de equipe também restauram um pouco de mana.')),
    S('miragem_eletrica', 'Miragem Elétrica', 'ilusionista', H, {'psychic': 35, 'energy': 35}, 'Ilusões que dão choque.', ('Miragem Elétrica', [('magicPower', .10), ('attackSpeed', .06), ('crit', .05)]), ('Choque Mental', 'st', 'energy'),
      keystone=('Curto-Circuito', 'Magias psíquicas têm 20% de chance de atordoar com choque.')),
    S('arcanista_ilusorio', 'Arcanista Ilusório', 'ilusionista', H, {'magic': 35, 'energy': 35}, 'Ilusões de energia pura.', ('Energia Ilusória', [('magicPower', .12), ('cooldown', .06)]), ('Prisma Ilusório', 'aoe', 'energy'),
      keystone=('Ilusão Perfeita', 'Magias têm 10% de chance de se duplicar.')),

    # ---------------------------------------------------------------- DRUIDA
    S('forma_feral', 'Forma Feral', 'druida', H, {'earth': 35, 'melee': 35}, 'Transforma-se em fera de garras.', ('Instinto Feral', [('attack', .10), ('maxHp', .10)]), ('Garras Selvagens', 'st', 'earth')),
    S('guardiao_da_natureza', 'Guardião da Natureza', 'druida', H, {'earth': 35, 'magic': 35}, 'A floresta protege o grupo.', ('Vínculo Natural', [('magicPower', .10), ('resistance', .08), ('maxHp', .06)]), ('Casca Protetora', 'teamshield', 'earth')),
    S('curandeiro_verde', 'Curandeiro Verde', 'druida', P, {'earth': 38}, 'Seiva que cura sem parar.', ('Seiva Vital', [('magicPower', .10), ('maxMana', .10)]), ('Florescer', 'teamheal', 'earth'), counter='healingDone',
      keystone=('Floresta Viva', 'Curas deixam uma regeneração que dura 6 s.')),
    S('senhor_das_bestas', 'Senhor das Bestas', 'druida', P, {'earth': 38}, 'Invoca matilhas selvagens.', ('Chamado Selvagem', [('maxHp', .10), ('attack', .06), ('magicPower', .06)]), ('Matilha', 'aoe', 'earth'),
      keystone=('Rei da Matilha', 'A cada 8 s uma fera invocada ataca o inimigo mais forte.')),
    S('espinheiro', 'Espinheiro', 'druida', P, {'earth': 38}, 'Espinhos e veneno: dano contínuo da terra.', ('Espinhos Venenosos', [('resistance', .08), ('magicPower', .10)]), ('Cerca de Espinhos', 'aoe', 'earth'), counter='dotDamage',
      keystone=('Sebe Mortal', 'Inimigos que atacam o grupo sofrem dano de espinhos.')),
    S('peconha_verde', 'Peçonha Verde', 'druida', H, {'earth': 35, 'poison': 35}, 'Esporos e toxinas da natureza.', ('Veneno da Terra', [('magicPower', .10), ('crit', .05)]), ('Esporos', 'aoe', 'poison'),
      keystone=('Esporos Infecciosos', 'Veneno se espalha ao matar um inimigo.')),

    # ---------------------------------------------------------------- ARTILHEIRO
    S('engenheiro_de_torretas', 'Engenheiro de Torretas', 'artilheiro', H, {'ranged': 35, 'energy': 35}, 'Torretas que atiram por você.', ('Torreta Auxiliar', [('attack', .10), ('attackSpeed', .08)]), ('Torreta', 'aoe', 'energy')),
    S('exotraje', 'Exotraje', 'artilheiro', H, {'ranged': 35, 'defense': 35}, 'Armadura motorizada: atira e aguenta.', ('Armadura Motorizada', [('defense', .12), ('maxHp', .10)]), ('Escudo de Energia', 'shield', 'energy')),
    S('franco_explosivo', 'Franco Explosivo', 'artilheiro', P, {'ranged': 38}, 'Munição perfurante e explosiva.', ('Munição Perfurante', [('crit', .08), ('attack', .10)]), ('Tiro Explosivo', 'big', None), counter='crits',
      keystone=('Impacto Crítico', 'Críticos explodem e atingem inimigos próximos.')),
    S('demolidor', 'Demolidor', 'artilheiro', P, {'ranged': 38}, 'Cargas que derrubam chefes.', ('Carga Demolidora', [('attack', .12), ('maxHp', .06)]), ('Carga de C4', 'big', None), counter='bossKills',
      keystone=('Demolição Total', 'Contra chefes, o primeiro tiro de cada wave causa o triplo.')),
    S('metralhador', 'Metralhador', 'artilheiro', P, {'ranged': 38}, 'Cadência máxima: balas sem parar.', ('Cadência Máxima', [('attackSpeed', .14), ('attack', .08)]), ('Rajada Infinita', 'aoe', None),
      keystone=('Barril em Brasa', 'Cada tiro seguido aumenta a velocidade em 2% (até 30%).')),
    S('artilheiro_flamejante', 'Artilheiro Flamejante', 'artilheiro', H, {'ranged': 35, 'fire': 35}, 'Balas incendiárias.', ('Balas Incendiárias', [('attack', .10), ('crit', .05)]), ('Disparo Incendiário', 'st', 'fire'),
      keystone=('Chamas de Chumbo', 'Tiros de fogo aplicam combustão que se acumula.')),
]
