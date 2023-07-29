import { Elements } from '@renderer/types/diagram';
import { Transition as TransitionType } from '@renderer/types/diagram';
import { Container } from '../basic/Container';
import { EventEmitter } from '../common/EventEmitter';
import { State } from '../drawable/State';
import { Transition } from '../drawable/Transition';
import { customAlphabet, nanoid } from 'nanoid';
import { Point } from '@renderer/types/graphics';
import { stateStyle } from '../styles';

/**
 * Данные машины состояний.
 * Хранит все состояния и переходы, предоставляет интерфейс
 * для работы с ними. Не отвечает за графику и события (эта логика
 * вынесена в контроллеры)
 *
 * @remark
 * Все изменения, вносимые на уровне данных, должны происходить
 * здесь. Сюда закладывается история правок, импорт и экспорт.
 */

// TODO Образовалось массивное болото, что не есть хорошо, надо додумать чем заменить переборы этих массивов.
export class StateMachine extends EventEmitter {
  container!: Container;
  initialState: string = '';
  states: Map<string, State> = new Map();
  transitions: Map<string, Transition> = new Map();

  constructor(container: Container) {
    super();
    this.container = container;
  }

  loadData(elements: Elements) {
    this.initStates(elements.states, elements.initialState);
    this.initTransitions(elements.transitions);
  }

  graphData() {
    return {
      states: { ...Object.fromEntries(this.states) },
      initialState: this.initialState,
      transitions: [...this.transitions.values()],
    };
  }

  initStates(items: Elements['states'], initialState: string) {
    this.initialState = initialState;

    for (const id in items) {
      const parent = this.states.get(items[id].parent ?? '');
      const state = new State({
        container: this.container,
        id,
        data: items[id],
        parent,
        initial: id === initialState,
      });
      this.container.states.watchState(state);
      this.states.set(id, state);
    }
  }

  initTransitions(items: Elements['transitions']) {
    for (const id in items) {
      const data = items[id];

      const sourceState = this.states.get(data.source) as State;
      const targetState = this.states.get(data.target) as State;

      const transition = new Transition(this.container, sourceState, targetState, data);

      this.transitions.set(id, transition);

      this.container.transitions.watchTransition(transition);
    }
  }

  //В разработке (обновление имя, начального состояния)
  updateState(name: string, newName: string, events: string, component: string, method: string) {
    //var startEvents = {};
    //startEvents[events] = { component, method };

    this.states.forEach((state, id) => {
      if (state.data.name === name) {
        console.log(state.data.name);
        state.data.name = newName;
      }
    });

    this.container.isDirty = true;
  }

  createNewState(name: string, position: Point) {
    const { width, height } = stateStyle;
    const x = position.x - width / 2;
    const y = position.y - height / 2;
    const nanoid = customAlphabet('abcdefghijklmnopqstuvwxyz', 20);
    var newId = nanoid();
    while (this.states.has(newId)) {
      newId = nanoid();
    }
    const state = new State({
      container: this.container,
      id: newId,
      data: {
        name: name,
        bounds: { x, y, width, height },
        events: [],
      },
    });

    // если у нас не было начального состояния, им станет новое
    if (this.initialState === '') {
      this.initialState = state.id;
    }

    // назначаем родительское состояние по месту его создания
    let possibleParent: State | undefined = undefined;
    for (const item of this.states.values()) {
      if (item.isUnderMouse(state.computedPosition)) {
        if (typeof possibleParent === 'undefined') {
          possibleParent = item;
        } else {
          // учитываем вложенность, нужно поместить состояние
          // в максимально дочернее
          let searchPending = true;
          while (searchPending) {
            searchPending = false;
            for (const child of possibleParent.children.values()) {
              if (!(child instanceof State)) continue;
              if (child.isUnderMouse(state.computedPosition)) {
                possibleParent = child as State;
                searchPending = true;
                break;
              }
            }
          }
        }
      }
    }
    if (typeof possibleParent !== 'undefined') {
      state.parent = possibleParent;
    }

    this.states.set(state.id, state);

    this.container.states.watchState(state);
    this.container.isDirty = true;
  }

  unlinkState(name: string) {
    const state = this.states.get(name);
    if (typeof state === 'undefined') return;
    if (typeof state!.parent === 'undefined') return;

    // Вычисляем новую координату, потому что после отсоединения родителя не сможем.
    const newBound = { ...state!.bounds, ...state!.compoundPosition };

    state!.parent = undefined;
    delete state!.data['parent'];

    state!.bounds = newBound;

    this.container.isDirty = true;
  }

  //TODO необходимо придумать очистку события на удалённые объекты
  deleteState(idState: string) {
    this.states.delete(idState);

    //Проходим массив связей, если же связи у удаляемой ноды имеются, то они тоже удаляются
    this.transitions.forEach((data, id) => {
      console.log(data);
      if (data.source.id === idState || data.target.id === idState) {
        console.log(data.source.id);
        this.transitions.delete(id);
      }
    });

    //Проходим массив детей, если же дети есть, то удаляем у них свойство привязки к родителю
    this.states.forEach((state) => {
      if (state.data.parent === idState) {
        this.unlinkState(state.id);
      }
    });
    this.container.isDirty = true;
  }

  //Изменения начального состояния
  initialStateCreate(idState: string) {
    this.states.forEach((data) => {
      if (data.id === idState) {
        this.initialState = '';
        this.initialState = idState;
      }
    });
    this.container.isDirty = true;
  }

  deleteTransition(bounds: string) {
    //Проходим массив связей, если же связи у удаляемой ноды имеются, то они тоже удаляются
    this.transitions.forEach((data, id) => {
      console.log(bounds);
      console.log(data.condition.bounds);
      if (JSON.stringify(data.condition.bounds) === JSON.stringify(bounds)) {
        this.transitions.delete(id);
      }
    });

    this.container.isDirty = true;
  }

  createNewTransitionFromData(
    source: State,
    target: State,
    transitionData: TransitionType,
    id?: string
  ) {
    const transition = new Transition(this.container, source, target, transitionData);

    const newId = typeof id !== 'undefined' ? id! : nanoid();
    this.transitions.set(newId, transition);

    this.container.transitions.watchTransition(transition);
    this.container.isDirty = true;
  }

  createNewTransition(
    source: State,
    target: State,
    color: string,
    component: string,
    method: string,
    pos?: Point,
    id?: string
  ) {
    // TODO Доделать парвильный condition
    const position =
      typeof pos !== 'undefined'
        ? pos!
        : {
            x: 100,
            y: 100,
          };
    const transitionData = {
      source: source.id,
      target: target.id,
      color,
      position,
      trigger: {
        component,
        method,
      },
    };
    this.createNewTransitionFromData(source, target, transitionData, id);
  }

  //Снять выделение с других нод при клике на новую
  removeSelection() {
    this.states.forEach((state) => {
      state.setIsSelected(false, '');
    });

    this.transitions.forEach((value) => {
      value.condition.setIsSelected(false, '');
    });

    this.container.isDirty = true;
  }
}